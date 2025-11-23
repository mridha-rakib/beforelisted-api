// file: src/config/email.config.ts

/**
 * Email Service Configuration
 * ✅ Centralized SMTP configuration
 * ✅ Environment-based settings
 * ✅ Support for multiple providers (Gmail, Brevo, AWS SES, etc.)
 * ✅ Rate limiting & connection pooling
 */

import { env } from "@/env";
import type { IEmailConfig, ISmtpConfig } from "@/services/email.types";
import { z } from "zod";

// ============================================
// VALIDATION SCHEMA
// ============================================

/**
 * Validate email configuration from environment
 */
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

// ============================================
// CONFIGURATION FACTORY
// ============================================

/**
 * Create email configuration from environment variables
 */
export function createEmailConfig(): IEmailConfig {
  // Validate environment variables
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

/**
 * Create SMTP configuration based on environment
 */
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
      maxConnections: isProduction ? 5 : 3,
      maxMessages: isProduction ? 100 : 50,
      rateDelta: 1000, // 1 second
      rateLimit: isProduction ? 10 : 20, // Max 10 emails per second in production
    },
    logger: !isProduction, // Enable logging in development
    debug: !isProduction, // Enable debug in development
  };
}

// ============================================
// PRESET CONFIGURATIONS
// ============================================

/**
 * Gmail SMTP configuration template
 */
export const GMAIL_CONFIG_TEMPLATE = {
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  note: "Use Gmail App Password (not your regular password)",
};

/**
 * Brevo (formerly Sendinblue) SMTP configuration template
 */
export const BREVO_CONFIG_TEMPLATE = {
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  note: "Use SMTP login credentials from Brevo dashboard",
};

/**
 * AWS SES SMTP configuration template
 */
export const AWS_SES_CONFIG_TEMPLATE = {
  host: "email-smtp.{region}.amazonaws.com",
  port: 587,
  secure: false,
  note: "Replace {region} with your AWS region (e.g., us-east-1)",
};

/**
 * Mailgun SMTP configuration template
 */
export const MAILGUN_CONFIG_TEMPLATE = {
  host: "smtp.mailgun.org",
  port: 587,
  secure: false,
  note: "Use postmaster@{domain} as username",
};

export const emailConfig = createEmailConfig();
