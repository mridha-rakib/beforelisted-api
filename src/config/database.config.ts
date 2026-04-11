// file: src/config/database.config.ts
import dns from "node:dns";
import mongoose from "mongoose";

import { env } from "@/env";
import { logger } from "@/middlewares/pino-logger";

const mongoSrvDnsFallbackServers = ["1.1.1.1", "8.8.8.8"];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isLoopbackDnsServer(server: string): boolean {
  return server === "::1" || server === "localhost" || server.startsWith("127.");
}

function configureMongoSrvDnsFallback(uri: string): void {
  let parsedUri: URL;

  try {
    parsedUri = new URL(uri);
  } catch {
    return;
  }

  if (parsedUri.protocol !== "mongodb+srv:") {
    return;
  }

  const currentDnsServers = dns.getServers();
  const usesLoopbackResolver = currentDnsServers.some(isLoopbackDnsServer);

  if (!usesLoopbackResolver) {
    return;
  }

  dns.setServers(mongoSrvDnsFallbackServers);
  logger.warn(
    {
      previousDnsServers: currentDnsServers,
      mongoSrvDnsFallbackServers,
    },
    "Using fallback DNS servers for MongoDB SRV lookup",
  );
}

async function connectDB(retries = 3, retryDelay = 5000) {
  mongoose.connection.on("connected", () => {
    logger.info("Mongoose connected to DB");
  });

  mongoose.connection.on("error", (err) => {
    logger.error(`Mongoose connection error: ${err}`);
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("Mongoose disconnected from DB");
  });

  process.on("SIGINT", async () => {
    await mongoose.connection.close();
    logger.info("Mongoose connection closed due to app termination");
    process.exit(0);
  });

  configureMongoSrvDnsFallback(env.MONGO_URI);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(env.MONGO_URI, {
        connectTimeoutMS: 10000,
        serverSelectionTimeoutMS: 10000,
      });
      return;
    } catch (error) {
      if (attempt < retries) {
        logger.warn(
          { err: error, attempt, retries },
          `MongoDB connection attempt failed. Retrying in ${
            retryDelay / 1000
          } seconds...`,
        );
        await delay(retryDelay);
        continue;
      }

      logger.error({ err: error }, "Error connecting to MongoDB database");
      throw error;
    }
  }
}

export { connectDB };
