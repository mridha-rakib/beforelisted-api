// file: src/seeders/admin.seeder.ts

import { ROLES } from "@/constants/app.constants";
import { logger } from "@/middlewares/pino-logger";
import { User } from "@/modules/user/user.model";
import { hashPassword } from "@/utils/password.utils";
import { ReferralUtil } from "@/utils/referral.utils";

/**
 * Admin Seeder
 * Creates default admin user with permanent referral link
 */
export class AdminSeeder {
  private static readonly DEFAULT_ADMIN = {
    email: "admin@rentalpennymore.com",
    password: "Admin@12345",
    fullName: "Admin User",
    phone: "+1234567890", // Add phone
    role: ROLES.ADMIN,
  };

  /**
   * Run seeder - creates admin if not exists
   */
  static async run(): Promise<void> {
    try {
      logger.info("Starting admin seeder...");

      // Check if admin already exists
      const existingAdmin = await User.findOne({
        email: this.DEFAULT_ADMIN.email,
        role: ROLES.ADMIN,
      });

      if (existingAdmin) {
        logger.info("Admin user already exists. Skipping seeder.");

        // Ensure admin has referral code
        if (!existingAdmin.referralCode) {
          const referralCode = ReferralUtil.generateReferralCode(ROLES.ADMIN);
          existingAdmin.referralCode = referralCode;
          await existingAdmin.save();

          logger.info(
            { referralCode, referralLink: existingAdmin.referralLink },
            "Admin referral code generated"
          );
        }

        return;
      }

      // Hash password
      const hashedPassword = await hashPassword(this.DEFAULT_ADMIN.password);

      // Generate referral code
      const referralCode = ReferralUtil.generateReferralCode(ROLES.ADMIN);

      // Create admin user
      const adminUser = new User({
        email: this.DEFAULT_ADMIN.email,
        password: hashedPassword,
        fullName: this.DEFAULT_ADMIN.fullName,
        phone: this.DEFAULT_ADMIN.phone,
        role: ROLES.ADMIN,
        referralCode, // ✅ Store referral code
        emailVerified: true,
        accountStatus: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await adminUser.save();

      logger.info(
        {
          email: this.DEFAULT_ADMIN.email,
          role: ROLES.ADMIN,
          referralCode,
          referralLink: adminUser.referralLink, // Virtual field
        },
        "✅ Admin user created successfully"
      );

      logger.warn(
        {
          email: this.DEFAULT_ADMIN.email,
          password: this.DEFAULT_ADMIN.password,
          referralLink: adminUser.referralLink,
        },
        "⚠️  IMPORTANT: Change admin password and save referral link!"
      );
    } catch (error) {
      logger.error(error, "Error running admin seeder");
      throw error;
    }
  }

  /**
   * Reset admin password to default (use with caution!)
   */
  static async resetAdminPassword(): Promise<void> {
    try {
      const hashedPassword = await hashPassword(this.DEFAULT_ADMIN.password);

      const admin = await User.findOneAndUpdate(
        { email: this.DEFAULT_ADMIN.email, role: ROLES.ADMIN },
        {
          password: hashedPassword,
          mustChangePassword: true, // Force password change
        },
        { new: true }
      );

      if (!admin) {
        throw new Error("Admin user not found");
      }

      logger.warn("Admin password reset to default. Change it immediately!");
    } catch (error) {
      logger.error(error, "Error resetting admin password");
      throw error;
    }
  }
}
