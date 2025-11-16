import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { connectDB } from "@/config/database.config";
import { logger } from "@/middlewares/pino-logger";
import UserModel from "@/modules/user/user.model";

const ADMIN_EMAIL = "crcteam@southernchangebhs.com";
const ADMIN_PASSWORD = "secureAdminPassword";
const ADMIN_NAME = "Shaina Love";
const ADMIN_ROLE = "admin";

async function seedAdmin() {
  logger.info("Seeding admin user started...");

  try {
    await connectDB();

    const session = await mongoose.startSession();
    session.startTransaction();

    logger.info("Clearing existing admins...");
    await UserModel.deleteMany({ role: ADMIN_ROLE }, { session });

    const existingAdmin = await UserModel.findOne({
      email: ADMIN_EMAIL,
    }).session(session);
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

      const newAdmin = new UserModel({
        fullName: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: ADMIN_ROLE,
        phoneNumber: "0123456789",
        createdAt: new Date(),
      });
      await newAdmin.save({ session });
      logger.info(`Admin user created: ${ADMIN_EMAIL}`);
    } else {
      logger.info("Admin user already exists.");
    }

    await session.commitTransaction();
    session.endSession();

    logger.info("Admin user seeding completed successfully.");
  } catch (error) {
    logger.error(error, "Error during admin user seeding");
  }
}

seedAdmin().catch((err) => console.error("Error running admin seeder:", err));
