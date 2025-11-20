// file: src/config/bootstrap.ts

import { logger } from "@/middlewares/pino-logger";
import { AdminSeeder } from "@/seeders/admin.seeder";

/**
 * Bootstrap application
 * Runs seeders and initialization logic
 */
export async function bootstrapApplication(): Promise<void> {
  try {
    logger.info("🚀 Bootstrapping application...");

    // Run admin seeder
    await AdminSeeder.run();

    logger.info("✅ Application bootstrapped successfully");
  } catch (error) {
    logger.error(error, "❌ Bootstrap failed");
    throw error;
  }
}
