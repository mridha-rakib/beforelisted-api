// file: src/config/bootstrap.ts

import { logger } from "@/middlewares/pino-logger";
import { AdminSeeder } from "@/seeders/admin.seeder";
import { NoticeSeeder } from "@/seeders/notice.seeder";
import { startPreMarketExpirationJob } from "@/jobs/pre-market-expiration.job";


export async function bootstrapApplication(): Promise<void> {
  try {
    logger.info("🚀 Bootstrapping application...");
    await AdminSeeder.run();
    await NoticeSeeder.run();
    startPreMarketExpirationJob();

    logger.info("✅ Application bootstrapped successfully");
  } catch (error) {
    logger.error(error, "❌ Bootstrap failed");
    throw error;
  }
}
