// file: src/seeders/agent.seeder.ts

import {
  ROLES,
  SYSTEM_DEFAULT_AGENT,
  SYSTEM_DEFAULT_ADMIN,
} from "@/constants/app.constants";
import { logger } from "@/middlewares/pino-logger";
import { AgentProfile } from "@/modules/agent/agent.model";
import { RenterModel } from "@/modules/renter/renter.model";
import { UserRepository } from "@/modules/user/user.repository";
import { hashPassword } from "@/utils/password.utils";
import { User } from "@/modules/user/user.model";

export class AgentSeeder {
  private static readonly DEFAULT_AGENT_PASSWORD = "Agent@12345";

  static async run(): Promise<void> {
    try {
      logger.info("Starting default agent seeder...");

      const userRepository = new UserRepository();
      const normalizedEmail = SYSTEM_DEFAULT_AGENT.email.toLowerCase();

      let seededAgentUser = await User.findOne({ email: normalizedEmail }).exec();

      if (seededAgentUser && seededAgentUser.role !== ROLES.AGENT) {
        throw new Error(
          `Cannot seed default agent. ${SYSTEM_DEFAULT_AGENT.email} already belongs to role ${seededAgentUser.role}.`,
        );
      }

      if (!seededAgentUser) {
        const hashedPassword = await hashPassword(this.DEFAULT_AGENT_PASSWORD);
        const referralCode = await userRepository.generateUniqueReferralCode(
          "AGT",
        );

        seededAgentUser = new User({
          email: normalizedEmail,
          password: hashedPassword,
          fullName: SYSTEM_DEFAULT_AGENT.fullName,
          phoneNumber: SYSTEM_DEFAULT_AGENT.phoneNumber,
          role: ROLES.AGENT,
          referralCode,
          emailVerified: true,
          accountStatus: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await seededAgentUser.save();

        logger.info(
          {
            email: seededAgentUser.email,
            referralCode: seededAgentUser.referralCode,
          },
          "Default agent user created successfully",
        );

        logger.warn(
          {
            email: SYSTEM_DEFAULT_AGENT.email,
            password: this.DEFAULT_AGENT_PASSWORD,
          },
          "Default agent seeded. Rotate this password in production.",
        );
      } else {
        const userUpdates: Record<string, any> = {};

        if (seededAgentUser.fullName !== SYSTEM_DEFAULT_AGENT.fullName) {
          userUpdates.fullName = SYSTEM_DEFAULT_AGENT.fullName;
        }

        if (seededAgentUser.phoneNumber !== SYSTEM_DEFAULT_AGENT.phoneNumber) {
          userUpdates.phoneNumber = SYSTEM_DEFAULT_AGENT.phoneNumber;
        }

        if (!seededAgentUser.emailVerified) {
          userUpdates.emailVerified = true;
        }

        if (seededAgentUser.accountStatus !== "active") {
          userUpdates.accountStatus = "active";
        }

        if (!seededAgentUser.referralCode) {
          userUpdates.referralCode =
            await userRepository.generateUniqueReferralCode("AGT");
        }

        if (Object.keys(userUpdates).length > 0) {
          seededAgentUser = (await User.findByIdAndUpdate(
            seededAgentUser._id,
            { $set: userUpdates },
            { new: true },
          ).exec()) as any;

          logger.info(
            { userId: seededAgentUser?._id?.toString?.() },
            "Default agent user updated by seeder",
          );
        } else {
          logger.info("Default agent user already exists. Skipping user create.");
        }
      }

      if (!seededAgentUser) {
        throw new Error("Default agent user could not be resolved.");
      }

      let profile = await AgentProfile.findOne({
        userId: seededAgentUser._id,
      }).exec();

      if (!profile) {
        profile = new AgentProfile({
          userId: seededAgentUser._id,
          licenseNumber: SYSTEM_DEFAULT_AGENT.licenseNumber,
          brokerageName: SYSTEM_DEFAULT_AGENT.brokerageName,
          title: SYSTEM_DEFAULT_AGENT.title,
          isActive: true,
          activeAt: new Date(),
        });

        await profile.save();

        logger.info(
          {
            userId: seededAgentUser._id.toString(),
            profileId: profile._id?.toString?.(),
          },
          "Default agent profile created successfully",
        );
      } else {
        const profileUpdates: Record<string, any> = {};

        if (profile.licenseNumber !== SYSTEM_DEFAULT_AGENT.licenseNumber) {
          profileUpdates.licenseNumber = SYSTEM_DEFAULT_AGENT.licenseNumber;
        }

        if (profile.brokerageName !== SYSTEM_DEFAULT_AGENT.brokerageName) {
          profileUpdates.brokerageName = SYSTEM_DEFAULT_AGENT.brokerageName;
        }

        if (profile.title !== SYSTEM_DEFAULT_AGENT.title) {
          profileUpdates.title = SYSTEM_DEFAULT_AGENT.title;
        }

        if (profile.isActive !== true) {
          profileUpdates.isActive = true;
          profileUpdates.activeAt = profile.activeAt || new Date();
        }

        if (Object.keys(profileUpdates).length > 0) {
          await AgentProfile.findByIdAndUpdate(
            profile._id,
            { $set: profileUpdates },
            { new: true },
          ).exec();

          logger.info(
            { profileId: profile._id?.toString?.() },
            "Default agent profile updated by seeder",
          );
        } else {
          logger.info(
            "Default agent profile already exists. Skipping profile create.",
          );
        }
      }

      const backfillResult = await RenterModel.updateMany(
        {
          registrationType: "admin_referral",
          $or: [
            { referredByAgentId: { $exists: false } },
            { referredByAgentId: null },
          ],
        },
        {
          $set: {
            referredByAgentId: seededAgentUser._id,
          },
        },
      ).exec();

      if ((backfillResult.modifiedCount || 0) > 0) {
        logger.info(
          { modifiedCount: backfillResult.modifiedCount },
          "Backfilled admin-referral renters with default assigned agent",
        );
      }

      logger.info(
        {
          seededAgentEmail: SYSTEM_DEFAULT_AGENT.email,
          protectedAdminEmail: SYSTEM_DEFAULT_ADMIN.email,
        },
        "Default system users are ensured",
      );
    } catch (error) {
      logger.error(error, "Error running default agent seeder");
      throw error;
    }
  }
}
