// file: src/config/bootstrap.ts

import { logger } from "@/middlewares/pino-logger";
import { AgentProfileRepository } from "@/modules/agent/agent.repository";
import { AdminSeeder } from "@/seeders/admin.seeder";
import { AgentSeeder } from "@/seeders/agent.seeder";
import { NoticeSeeder } from "@/seeders/notice.seeder";
import { startPreMarketExpirationJob } from "@/jobs/pre-market-expiration.job";
import { startPreMarketSearchConfirmationJob } from "@/jobs/pre-market-search-confirmation.job";


export async function bootstrapApplication(): Promise<void> {
  try {
    logger.info("🚀 Bootstrapping application...");
    await AdminSeeder.run();
    await AgentSeeder.run();
    const migratedAgentEmailSubscriptionCount =
      await new AgentProfileRepository().migrateLegacySharedRequestEmailSubscriptionField();
    if (migratedAgentEmailSubscriptionCount > 0) {
      logger.info(
        { migratedAgentEmailSubscriptionCount },
        "Migrated legacy shared request email subscriptions into emailSubscriptionEnabled",
      );
    }
    await NoticeSeeder.run();
    startPreMarketExpirationJob();
    startPreMarketSearchConfirmationJob();

    logger.info("✅ Application bootstrapped successfully");
  } catch (error) {
    logger.error(error, "❌ Bootstrap failed");
    throw error;
  }
}
