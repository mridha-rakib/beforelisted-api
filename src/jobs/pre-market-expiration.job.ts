// file: src/jobs/pre-market-expiration.job.ts

import cron from "node-cron";
import { logger } from "@/middlewares/pino-logger";
import { PreMarketService } from "@/modules/pre-market/pre-market.service";

const EXPIRATION_CRON_SCHEDULE = "*/5 * * * *";

let isRunning = false;

const runExpirationSweep = async (service: PreMarketService): Promise<void> => {
  if (isRunning) {
    logger.warn("Pre-market expiration sweep already running; skipping");
    return;
  }

  isRunning = true;

  try {
    const result = await service.expireRequests();
    if (result.expiredCount > 0 || result.failedCount > 0) {
      logger.info(
        {
          expiredCount: result.expiredCount,
          deletedCount: result.deletedCount,
          failedCount: result.failedCount,
        },
        "Expired pre-market requests processed"
      );
    }
  } catch (error) {
    logger.error({ error }, "Failed to process expired pre-market requests");
  } finally {
    isRunning = false;
  }
};

export const startPreMarketExpirationJob = (): void => {
  const service = new PreMarketService();

  cron.schedule(EXPIRATION_CRON_SCHEDULE, () => {
    void runExpirationSweep(service);
  });

  logger.info(
    { schedule: EXPIRATION_CRON_SCHEDULE },
    "Pre-market expiration job scheduled"
  );

  void runExpirationSweep(service);
};
