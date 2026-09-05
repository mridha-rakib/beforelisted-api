/* eslint-disable no-console */
/**
 * One-time backfill for `GrantAccessRequest.scopeAtMatch`.
 *
 * Older grant records predate the `scopeAtMatch` field and have it as `null`.
 * For those records, copy the parent preMarketRequest's CURRENT `scope`
 * value into the grant's `scopeAtMatch` field. This is a best-effort
 * approximation: we don't have a full scope-change history for legacy
 * requests, so the current scope is the best proxy available.
 *
 * IMPORTANT:
 *  - Dry-run by default. Pass `--apply` to actually write to MongoDB.
 *  - Only touches records where `scopeAtMatch` is currently `null`.
 *  - Records where `scopeAtMatch` already has a value are NEVER touched.
 *  - Records whose parent request is missing or has an undefined scope are
 *    skipped (we don't guess).
 *
 * Usage:
 *   tsx --env-file=.env scripts/backfill-grant-scope-at-match.ts          # dry run
 *   tsx --env-file=.env scripts/backfill-grant-scope-at-match.ts --apply  # write
 */

import mongoose from "mongoose";

import { env } from "@/env";
import { logger } from "@/middlewares/pino-logger";
import { GrantAccessRequestModel } from "@/modules/grant-access/grant-access.model";
import { PreMarketRequestModel } from "@/modules/pre-market/pre-market.model";

type Scope = "Upcoming" | "All Market";

type Summary = {
  totalGrantsScanned: number;
  alreadyHasScopeAtMatch: number;
  eligibleForBackfill: number;
  parentRequestMissing: number;
  parentRequestNoScope: number;
  backfilled: number;
  errors: number;
};

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");

  console.log("=================================================");
  console.log("GrantAccessRequest.scopeAtMatch backfill");
  console.log("=================================================");
  console.log(`Mode: ${apply ? "APPLY (will write to DB)" : "DRY RUN (no writes)"}`);
  console.log(`Mongo URI host: ${new URL(env.MONGO_URI).host}`);
  console.log("");

  await mongoose.connect(env.MONGO_URI, {
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000,
  });
  console.log("✓ Connected to MongoDB\n");

  const summary: Summary = {
    totalGrantsScanned: 0,
    alreadyHasScopeAtMatch: 0,
    eligibleForBackfill: 0,
    parentRequestMissing: 0,
    parentRequestNoScope: 0,
    backfilled: 0,
    errors: 0,
  };

  const cursor = GrantAccessRequestModel.find(
    { scopeAtMatch: null },
    { _id: 1, preMarketRequestId: 1, scopeAtMatch: 1, status: 1, createdAt: 1 },
  ).cursor();

  for await (const grant of cursor as unknown as AsyncIterable<{
    _id: mongoose.Types.ObjectId;
    preMarketRequestId: mongoose.Types.ObjectId;
    scopeAtMatch: Scope | null;
    status: string;
    createdAt: Date;
  }>) {
    summary.totalGrantsScanned += 1;

    if (grant.scopeAtMatch !== null) {
      summary.alreadyHasScopeAtMatch += 1;
      continue;
    }

    summary.eligibleForBackfill += 1;

    let requestScope: Scope | undefined;
    try {
      const parent = await PreMarketRequestModel.findById(
        grant.preMarketRequestId,
        { scope: 1 },
      ).lean();
      if (!parent) {
        summary.parentRequestMissing += 1;
        logger.warn(
          { grantId: grant._id.toString(), preMarketRequestId: grant.preMarketRequestId.toString() },
          "Parent preMarketRequest not found; skipping",
        );
        continue;
      }
      if (parent.scope !== "Upcoming" && parent.scope !== "All Market") {
        summary.parentRequestNoScope += 1;
        logger.warn(
          { grantId: grant._id.toString(), preMarketRequestId: grant.preMarketRequestId.toString(), parentScope: parent.scope },
          "Parent scope is not a known value; skipping",
        );
        continue;
      }
      requestScope = parent.scope;
    }
    catch (error) {
      summary.errors += 1;
      logger.error(
        { error, grantId: grant._id.toString() },
        "Failed to look up parent request; skipping",
      );
      continue;
    }

    if (apply) {
      try {
        await GrantAccessRequestModel.updateOne(
          { _id: grant._id, scopeAtMatch: null }, // double-guard: only update if still null
          { $set: { scopeAtMatch: requestScope } },
        );
        summary.backfilled += 1;
      }
      catch (error) {
        summary.errors += 1;
        logger.error(
          { error, grantId: grant._id.toString() },
          "Failed to update grant; skipping",
        );
      }
    }
    else {
      summary.backfilled += 1;
    }
  }

  console.log("\n=================================================");
  console.log("Summary");
  console.log("=================================================");
  console.log(`Total grants scanned (scopeAtMatch == null): ${summary.totalGrantsScanned}`);
  console.log(`  Already had scopeAtMatch set:              ${summary.alreadyHasScopeAtMatch}`);
  console.log(`  Eligible for backfill:                     ${summary.eligibleForBackfill}`);
  console.log(`    Parent request missing:                  ${summary.parentRequestMissing}`);
  console.log(`    Parent request has no scope:             ${summary.parentRequestNoScope}`);
  if (apply) {
    console.log(`  Successfully backfilled:                   ${summary.backfilled}`);
    console.log(`  Errors during update:                      ${summary.errors}`);
  }
  else {
    console.log(`  Would backfill (DRY RUN):                  ${summary.backfilled}`);
    console.log("");
    console.log("Run with --apply to perform the writes.");
  }
  console.log("=================================================");

  await mongoose.disconnect();
  console.log("\n✓ Disconnected from MongoDB");
}

main().catch(async (error) => {
  logger.error({ error }, "Backfill script failed");
  try {
    await mongoose.disconnect();
  }
  catch {
    // ignore
  }
  process.exit(1);
});
