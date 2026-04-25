import cron from "node-cron";
import { logger } from "@/middlewares/pino-logger";
import { PreMarketService } from "@/modules/pre-market/pre-market.service";

const SEARCH_CONFIRMATION_CRON_SCHEDULE = "*/5 * * * *";

let isRunning = false;

const runSearchConfirmationSweep = async (
  service: PreMarketService,
): Promise<void> => {
  if (isRunning) {
    logger.warn("Pre-market search confirmation sweep already running; skipping");
    return;
  }

  isRunning = true;

  try {
    const result = await service.processAutomaticSearchConfirmationSweep();
    if (
      result.remindersSent > 0 ||
      result.archivedRequests > 0 ||
      result.failedCount > 0
    ) {
      logger.info(result, "Pre-market search confirmation sweep processed");
    }
  } catch (error) {
    logger.error({ error }, "Failed to process pre-market search confirmation sweep");
  } finally {
    isRunning = false;
  }
};

export const startPreMarketSearchConfirmationJob = (): void => {
  const service = new PreMarketService();

  cron.schedule(SEARCH_CONFIRMATION_CRON_SCHEDULE, () => {
    void runSearchConfirmationSweep(service);
  });

  logger.info(
    { schedule: SEARCH_CONFIRMATION_CRON_SCHEDULE },
    "Pre-market search confirmation job scheduled",
  );

  void runSearchConfirmationSweep(service);
};
