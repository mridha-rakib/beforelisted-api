// file: src/config/email.config.ts

import { env } from "@/env";
import type { IEmailConfig, IPostmarkConfig } from "@/services/email.types";
import { z } from "zod";

const emailConfigSchema = z.object({
  POSTMARK_API_TOKEN: z.string().min(1, "POSTMARK_API_TOKEN is required"),
  POSTMARK_MESSAGE_STREAM: z
    .enum(["outbound", "broadcast"])
    .default("outbound"),
  POSTMARK_SANDBOX_MODE: z.coerce.boolean().default(false),
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
    postmark: createPostmarkConfig(envVars),
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

function createPostmarkConfig(envVars: EmailConfigInput): IPostmarkConfig {
  const isProduction = envVars.NODE_ENV === "production";

  return {
    apiToken: envVars.POSTMARK_API_TOKEN,
    messageStream: envVars.POSTMARK_MESSAGE_STREAM,
    sandboxMode: envVars.POSTMARK_SANDBOX_MODE && !isProduction,
    serverUrl: "https://api.postmarkapp.com",
    timeout: isProduction ? 15000 : 10000,
  };
}

export const emailConfig = createEmailConfig();
