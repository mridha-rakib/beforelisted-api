// file: src/index.ts
import app from "@/app";
import { connectDB } from "@/config/database.config";
import { env } from "@/env";
import { logger } from "@/middlewares/pino-logger";
import { bootstrapApplication } from "./config/bootstrap";

const port = env.PORT;

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught Exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled Rejection");
  process.exit(1);
});

async function startServer() {
  await connectDB();
  await bootstrapApplication();

  const server = app.listen(port, () => {
    logger.info(`Listening: http://localhost:${port}`);
    logger.info(`API Documentation: http://localhost:${port}/api/v1/docs`);
  });

  server.on("error", (err) => {
    if ("code" in err && err.code === "EADDRINUSE") {
      logger.fatal(
        `Port ${env.PORT} is already in use. Please choose another port or stop the process using it.`,
      );
    } else {
      logger.fatal({ err }, "Failed to start server");
    }

    process.exit(1);
  });
}

startServer().catch((err) => {
  logger.fatal({ err }, "Failed to start application");
  process.exit(1);
});
