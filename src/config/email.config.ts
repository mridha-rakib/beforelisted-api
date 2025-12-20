// file: src/config/email.config.ts

import { env } from "@/env";
import type { IEmailConfig, ISmtpConfig } from "@/services/email.types";
import { z } from "zod";

const emailConfigSchema = z.object({
  SMTP_HOST: z.string().min(1, "SMTP_HOST is required"),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  SMTP_USER: z.string().min(1, "SMTP_USER is required"),
  SMTP_PASS: z.string().min(1, "SMTP_PASS is required"),
  EMAIL_FROM_NAME: z.string().default("BeforeListed"),
  EMAIL_FROM_ADDRESS: z.email("EMAIL_FROM_ADDRESS must be valid email"),
  EMAIL_REPLY_TO: z.email().optional(),
  EMAIL_LOGO_URL: z.url("Must be valid URL").optional(),
  EMAIL_BRAND_COLOR: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  EMAIL_MAX_RETRIES: z.coerce.number().int(),
  EMAIL_RETRY_DELAY_MS: z.coerce.number().int(),
  NODE_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),
});

type EmailConfigInput = z.infer<typeof emailConfigSchema>;

export function createEmailConfig(): IEmailConfig {
  const envVars = emailConfigSchema.parse(process.env);

  const config: IEmailConfig = {
    smtp: createSmtpConfig(envVars),
    from: {
      name: env.EMAIL_FROM_NAME,
      email: env.EMAIL_FROM_ADDRESS,
    },
    replyTo: env.EMAIL_REPLY_TO,
    logoUrl: env.EMAIL_LOGO_URL,
    brandColor: env.EMAIL_BRAND_COLOR,
    maxRetries: env.EMAIL_MAX_RETRIES,
    retryDelayMs: env.EMAIL_RETRY_DELAY_MS,
  };

  return config;
}

function createSmtpConfig(envVars: EmailConfigInput): ISmtpConfig {
  const isProduction = envVars.NODE_ENV === "production";

  return {
    host: envVars.SMTP_HOST,
    port: envVars.SMTP_PORT,
    secure: envVars.SMTP_SECURE,
    auth: {
      user: envVars.SMTP_USER,
      pass: envVars.SMTP_PASS,
    },
    pool: {
      maxConnections: isProduction ? 3 : 2,
      maxMessages: isProduction ? 50 : 50,
      rateDelta: 1000,
      rateLimit: isProduction ? 2 : 5,
    },
    logger: !isProduction,
    debug: !isProduction,
  };
}

export const emailConfig = createEmailConfig();
