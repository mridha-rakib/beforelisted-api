// file: src/seeders/admin.seeder.ts

import { logger } from "@/middlewares/pino-logger";
import { Notice } from "@/modules/notice/notice.model";
/**
 * Admin Seeder
 * Creates default admin user with permanent referral link
 */
export class NoticeSeeder {
  private static readonly DEFAULT_NOTICE = {
    content: "BeforeListed - renter & agent communication",
  };

  static async run(): Promise<void> {
    try {
      logger.info("Starting admin seeder...");

      const existingNotice = await Notice.findOne();

      if (existingNotice) {
        logger.info("Admin user already exists. Skipping seeder.");
        return;
      }
      const notice = new Notice({
        content: this.DEFAULT_NOTICE.content,
      });
      await notice.save();
      logger.info(notice, "Notice created successfully");
    } catch (error) {
      logger.error(error, "Error running admin seeder");
      throw error;
    }
  }
}
