import cron from "node-cron";

import { logger } from "@/middlewares/pino-logger";
import { PreMarketService } from "@/modules/pre-market/pre-market.service";

const UPCOMING_SEARCH_EXPANSION_REMINDER_CRON_SCHEDULE = "*/5 * * * *";

let isRunning = false;

async function runUpcomingSearchExpansionReminderSweep(
  service: PreMarketService,
): Promise<void> {
  if (isRunning) {
    logger.warn(
      "Pre-market upcoming search expansion reminder sweep already running; skipping",
    );
    return;
  }

  isRunning = true;

  try {
    const result =
      await service.processUpcomingSearchExpansionReminderSweep();
    if (
      result.remindersSent > 0
      || result.failedCount > 0
    ) {
      logger.info(
        result,
        "Pre-market upcoming search expansion reminder sweep processed",
      );
    }
  } catch (error) {
    logger.error(
      { error },
      "Failed to process pre-market upcoming search expansion reminder sweep",
    );
  } finally {
    isRunning = false;
  }
}

export function startPreMarketUpcomingSearchExpansionReminderJob(): void {
  const service = new PreMarketService();

  cron.schedule(UPCOMING_SEARCH_EXPANSION_REMINDER_CRON_SCHEDULE, () => {
    void runUpcomingSearchExpansionReminderSweep(service);
  });

  logger.info(
    { schedule: UPCOMING_SEARCH_EXPANSION_REMINDER_CRON_SCHEDULE },
    "Pre-market upcoming search expansion reminder job scheduled",
  );

  void runUpcomingSearchExpansionReminderSweep(service);
}
