// file: src/middlewares/pino-logger.ts

import dayjs from "dayjs";
import { randomUUID } from "node:crypto";
import pino from "pino";
import pinoHttp from "pino-http";
import pretty from "pino-pretty";

import { env } from "@/env";

const REDACTED_LOG_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers.x-api-key",
  "req.body.password",
  "req.body.token",
  "req.body.accessToken",
  "req.body.refreshToken",
  "req.body.otp",
  "req.body.code",
  "body.password",
  "body.token",
  "body.accessToken",
  "body.refreshToken",
  "body.otp",
  "body.code",
];

function validRequestId(value: unknown): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (
    typeof candidate === "string"
    && /^[\w.-]{1,128}$/.test(candidate)
  ) {
    return candidate;
  }
  return undefined;
}

const logger = pino(
  {
    level: env.LOG_LEVEL || "info",
    timestamp: () => `,"time":"${dayjs().format("YYYY-MM-DD HH:mm:ss")}"`,
    redact: {
      paths: REDACTED_LOG_PATHS,
      censor: "[Redacted]",
    },
  },
  env.NODE_ENV === "production" ? undefined : pretty(),
);

function pinoLogger() {
  return pinoHttp({
    logger: logger as any,
    genReqId(req, res) {
      const existingID
        = validRequestId(req.id) ?? validRequestId(req.headers["x-request-id"]);
      if (existingID)
        return existingID;
      const id = randomUUID();
      res.setHeader("X-Request-Id", id);
      return id;
    },
    useLevel: env.LOG_LEVEL,
  });
}

export { logger, pinoLogger };
