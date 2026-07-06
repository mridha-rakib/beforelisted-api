// file: src/utils/performance-observer.utils.ts

import type { NextFunction, Request, Response } from "express";

import { AsyncLocalStorage } from "node:async_hooks";
import { performance } from "node:perf_hooks";
import mongoose from "mongoose";

import { logger } from "@/middlewares/pino-logger";

type SlowQueryLog = {
  collection: string;
  operation: string;
  durationMs: number;
  failed?: boolean;
};

type DbOperationStats = {
  count: number;
  totalDurationMs: number;
  slowCount: number;
  failedCount: number;
};

type DbCollectionStats = {
  queryCount: number;
  totalDurationMs: number;
  operations: Record<string, DbOperationStats>;
};

type PerformanceContext = {
  requestStartedAt: number;
  requestStartTimestamp: string;
  route: string;
  timings: Record<string, number>;
  metrics: Record<string, number>;
  responseSizeBytes: number;
  dbQueryCount: number;
  dbQueryTimeMs: number;
  dbCollections: Set<string>;
  dbCollectionStats: Record<string, DbCollectionStats>;
  slowQueries: SlowQueryLog[];
};

const observedRoutes = [
  "/pre-market/agent/match-search",
  "/pre-market/all",
  "/pre-market/agent/all-requests",
  "/pre-market/admin/requests",
  "/pre-market/renter/requests/with-agents",
] as const;

const slowQueryThresholdMs
  = Number(process.env.PERF_SLOW_QUERY_MS || 100) || 100;

const performanceContext = new AsyncLocalStorage<PerformanceContext>();
const observedExecSymbol = Symbol.for("beforelisted.performanceObserver.exec");
const observedAggregateExecSymbol = Symbol.for(
  "beforelisted.performanceObserver.aggregateExec",
);

let mongooseObserverInstalled = false;

export function nowMs() {
  return performance.now();
}

function roundMs(value: number) {
  return Math.round(value * 100) / 100;
}

function getObservedRoute(originalUrl: string) {
  const pathname = (originalUrl || "").split("?")[0]?.replace(/\/$/, "") || "/";
  return observedRoutes.find(route => pathname === route || pathname.endsWith(route));
}

function addDurationToContext(
  context: PerformanceContext,
  name: string,
  durationMs: number,
) {
  context.timings[name] = roundMs((context.timings[name] || 0) + durationMs);
}

export function addPerformanceTiming(name: string, durationMs: number) {
  const context = performanceContext.getStore();
  if (!context) {
    return;
  }

  addDurationToContext(context, name, durationMs);
}

export function setPerformanceMetric(name: string, value: number) {
  const context = performanceContext.getStore();
  if (!context) {
    return;
  }

  context.metrics[name] = value;
}

export function incrementPerformanceMetric(name: string, amount = 1) {
  const context = performanceContext.getStore();
  if (!context) {
    return;
  }

  context.metrics[name] = (context.metrics[name] || 0) + amount;
}

export async function observePerformanceAsync<T>(
  timingName: string,
  fn: () => Promise<T>,
): Promise<T> {
  const startedAt = nowMs();

  try {
    return await fn();
  }
  finally {
    addPerformanceTiming(timingName, nowMs() - startedAt);
  }
}

function getChunkSize(
  chunk: unknown,
  encoding?: BufferEncoding | string,
): number {
  if (!chunk) {
    return 0;
  }

  if (Buffer.isBuffer(chunk)) {
    return chunk.length;
  }

  if (typeof chunk === "string") {
    return Buffer.byteLength(
      chunk,
      typeof encoding === "string" ? (encoding as BufferEncoding) : undefined,
    );
  }

  if (chunk instanceof Uint8Array) {
    return chunk.byteLength;
  }

  return 0;
}

function patchResponseMetrics(res: Response, context: PerformanceContext) {
  const response = res as any;
  const originalWrite = response.write;
  const originalEnd = response.end;
  const originalJson = response.json;

  response.write = function observedWrite(chunk: unknown, ...args: unknown[]) {
    context.responseSizeBytes += getChunkSize(
      chunk,
      typeof args[0] === "string" ? args[0] : undefined,
    );
    return originalWrite.call(this, chunk, ...args);
  };

  response.end = function observedEnd(chunk?: unknown, ...args: unknown[]) {
    context.responseSizeBytes += getChunkSize(
      chunk,
      typeof args[0] === "string" ? args[0] : undefined,
    );
    return originalEnd.call(this, chunk, ...args);
  };

  response.json = function observedJson(body: unknown) {
    const startedAt = nowMs();

    try {
      return originalJson.call(this, body);
    }
    finally {
      addDurationToContext(
        context,
        "responseSerializationTimeMs",
        nowMs() - startedAt,
      );
    }
  };
}

function buildDerivedMetrics(metrics: Record<string, number>) {
  const derivedMetrics = { ...metrics };
  const adminRequestsOnPage = metrics["admin.requestsOnPage"] || 0;

  if (adminRequestsOnPage > 0) {
    derivedMetrics["admin.grantAccessLookupsPerRequest"] = roundMs(
      (metrics["admin.grantAccessLookups"] || 0) / adminRequestsOnPage,
    );
    derivedMetrics["admin.renterReferrerLookupsPerRequest"] = roundMs(
      (metrics["admin.renterReferrerLookups"] || 0) / adminRequestsOnPage,
    );
    derivedMetrics["admin.agentUserLookupsPerRequest"] = roundMs(
      (metrics["admin.agentUserLookups"] || 0) / adminRequestsOnPage,
    );
    derivedMetrics["admin.agentProfileLookupsPerRequest"] = roundMs(
      (metrics["admin.agentProfileLookups"] || 0) / adminRequestsOnPage,
    );
  }

  return derivedMetrics;
}

function buildDbCollectionStats(
  collectionStats: Record<string, DbCollectionStats>,
) {
  return Object.fromEntries(
    Object.entries(collectionStats).map(([collection, stats]) => [
      collection,
      {
        queryCount: stats.queryCount,
        totalDurationMs: roundMs(stats.totalDurationMs),
        operations: Object.fromEntries(
          Object.entries(stats.operations).map(([operation, operationStats]) => [
            operation,
            {
              count: operationStats.count,
              totalDurationMs: roundMs(operationStats.totalDurationMs),
              avgDurationMs: operationStats.count > 0
                ? roundMs(operationStats.totalDurationMs / operationStats.count)
                : 0,
              slowCount: operationStats.slowCount,
              failedCount: operationStats.failedCount,
            },
          ]),
        ),
      },
    ]),
  );
}

function logRequestPerformance(
  req: Request,
  res: Response,
  context: PerformanceContext,
) {
  const totalRequestTimeMs = roundMs(nowMs() - context.requestStartedAt);
  const requestEndTimestamp = new Date().toISOString();
  const logPayload = {
    event: "performance_observability_summary",
    requestId: req.id || req.headers["x-request-id"],
    method: req.method,
    route: context.route,
    path: req.originalUrl,
    requestStartTimestamp: context.requestStartTimestamp,
    requestEndTimestamp,
    statusCode: res.statusCode,
    totalRequestTimeMs,
    responseSizeBytes: context.responseSizeBytes,
    timings: context.timings,
    metrics: buildDerivedMetrics(context.metrics),
    db: {
      queryCount: context.dbQueryCount,
      totalQueryTimeMs: roundMs(context.dbQueryTimeMs),
      collections: Array.from(context.dbCollections),
      collectionStats: buildDbCollectionStats(context.dbCollectionStats),
      slowQueryThresholdMs,
      slowQueries: context.slowQueries,
    },
  };

  setImmediate(() => {
    logger.info(logPayload, "Performance observability summary");
  });
}

export function performanceObserverMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const route = getObservedRoute(req.originalUrl || req.url);

  if (!route) {
    next();
    return;
  }

  const context: PerformanceContext = {
    requestStartedAt: nowMs(),
    requestStartTimestamp: new Date().toISOString(),
    route,
    timings: {},
    metrics: {},
    responseSizeBytes: 0,
    dbQueryCount: 0,
    dbQueryTimeMs: 0,
    dbCollections: new Set<string>(),
    dbCollectionStats: {},
    slowQueries: [],
  };

  performanceContext.run(context, () => {
    patchResponseMetrics(res, context);
    res.once("finish", () => logRequestPerformance(req, res, context));
    next();
  });
}

function observeDbQuery(
  collection: string,
  operation: string,
  durationMs: number,
  failed = false,
) {
  const context = performanceContext.getStore();
  if (!context) {
    return;
  }

  const roundedDuration = roundMs(durationMs);
  context.dbQueryCount += 1;
  context.dbQueryTimeMs += durationMs;
  context.dbCollections.add(collection);
  addDurationToContext(context, "repositoryDbQueryTimeMs", durationMs);
  const collectionStats = context.dbCollectionStats[collection] ?? {
    queryCount: 0,
    totalDurationMs: 0,
    operations: {},
  };
  const operationStats = collectionStats.operations[operation] ?? {
    count: 0,
    totalDurationMs: 0,
    slowCount: 0,
    failedCount: 0,
  };

  collectionStats.queryCount += 1;
  collectionStats.totalDurationMs += durationMs;
  operationStats.count += 1;
  operationStats.totalDurationMs += durationMs;

  if (failed) {
    operationStats.failedCount += 1;
  }

  if (durationMs >= slowQueryThresholdMs) {
    operationStats.slowCount += 1;
  }

  collectionStats.operations[operation] = operationStats;
  context.dbCollectionStats[collection] = collectionStats;

  if (durationMs >= slowQueryThresholdMs) {
    context.slowQueries.push({
      collection,
      operation,
      durationMs: roundedDuration,
      failed,
    });
  }
}

function getQueryCollection(query: any) {
  return query?.model?.collection?.name || query?.collection?.name || "unknown";
}

function getAggregateCollection(aggregate: any) {
  const model = aggregate?._model || aggregate?.model?.();
  return model?.collection?.name || "unknown";
}

export function installMongooseQueryObserver() {
  if (mongooseObserverInstalled) {
    return;
  }

  const queryPrototype = (mongoose as any).Query?.prototype;
  if (queryPrototype && !queryPrototype[observedExecSymbol]) {
    const originalExec = queryPrototype.exec;
    Object.defineProperty(queryPrototype, observedExecSymbol, {
      value: true,
      configurable: false,
    });

    queryPrototype.exec = function observedQueryExec(...args: any[]) {
      const collection = getQueryCollection(this);
      const operation = this?.op || "query";
      const startedAt = nowMs();
      let result: Promise<unknown>;

      try {
        result = Promise.resolve(originalExec.apply(this, args));
      }
      catch (error) {
        observeDbQuery(collection, operation, nowMs() - startedAt, true);
        throw error;
      }

      return result.then(
        (value) => {
          observeDbQuery(collection, operation, nowMs() - startedAt);
          return value;
        },
        (error) => {
          observeDbQuery(collection, operation, nowMs() - startedAt, true);
          throw error;
        },
      );
    };
  }

  const aggregatePrototype = (mongoose as any).Aggregate?.prototype;
  if (aggregatePrototype && !aggregatePrototype[observedAggregateExecSymbol]) {
    const originalAggregateExec = aggregatePrototype.exec;
    Object.defineProperty(aggregatePrototype, observedAggregateExecSymbol, {
      value: true,
      configurable: false,
    });

    aggregatePrototype.exec = function observedAggregateExec(...args: any[]) {
      const collection = getAggregateCollection(this);
      const startedAt = nowMs();
      let result: Promise<unknown>;

      try {
        result = Promise.resolve(originalAggregateExec.apply(this, args));
      }
      catch (error) {
        observeDbQuery(collection, "aggregate", nowMs() - startedAt, true);
        throw error;
      }

      return result.then(
        (value) => {
          observeDbQuery(collection, "aggregate", nowMs() - startedAt);
          return value;
        },
        (error) => {
          observeDbQuery(collection, "aggregate", nowMs() - startedAt, true);
          throw error;
        },
      );
    };
  }

  mongooseObserverInstalled = true;
}
