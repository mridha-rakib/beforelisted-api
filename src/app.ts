// file: src/app.ts
import type { Application, NextFunction, Request, Response } from "express";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import {
  swaggerSpec,
  swaggerUi,
  swaggerUiOptions,
} from "@/config/swagger.config";
import { errorHandler } from "@/middlewares/error-handler.middleware";
import { notFound } from "@/middlewares/not-found.middleware";
import rootRouter from "@/routes/index.route.js";

import { env } from "./env.js";
import { pinoLogger } from "./middlewares/pino-logger.js";
import { PreMarketController } from "./modules/pre-market/pre-market.controller.js";

const app: Application = express();
const controller = new PreMarketController();
// Capture raw body for Stripe signature verification
const captureRawBody = (
  req: any,
  res: any,
  buf: Buffer,
  encoding: string | undefined
) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString((encoding as BufferEncoding) || "utf8");
  }
};

// POST webhook with raw body middleware
app.post(
  "/api/v1/pre-market/payment/webhook",
  express.raw({ type: "application/json", verify: captureRawBody }),
  controller.handleWebhook.bind(controller)
);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());
app.use(pinoLogger());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(helmet());

app.get<object>("/", (req, res) => {
  res.json({
    message: "🦄R🌈A✨K👋I🌎B✨M🌈M🦄",
  });
});

app.use(
  "/api-docs",
  swaggerUi.serve,
  (req: Request, res: Response, next: NextFunction) => {
    swaggerUi.setup(swaggerSpec, swaggerUiOptions)(req, res, next);
  }
);

app.use(env.BASE_URL, rootRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
