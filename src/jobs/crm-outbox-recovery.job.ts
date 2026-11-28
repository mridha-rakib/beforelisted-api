import cron from "node-cron";

import { logger } from "@/middlewares/pino-logger";
import { EmailService } from "@/services/email.service";

/** Only never-claimed ready records are recovered; pending records require review. */
export function startCrmOutboxRecoveryJob(): void {
  const email = new EmailService();
  const run = () => email.dispatchReadyCrmOutbox().catch(() => logger.error("CRM outbox recovery failed"));
  cron.schedule("* * * * *", run, { noOverlap: true });
  void run();
  const recoverSecondary = () => email.recoverSecondaryCopies().catch(() => logger.error("Secondary copy outbox recovery failed"));
  cron.schedule("*/10 * * * * *", recoverSecondary, { noOverlap: true });
  void recoverSecondary();
}
