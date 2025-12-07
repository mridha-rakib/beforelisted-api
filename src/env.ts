// file: src/env.ts
import { z } from "zod/v4";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  APP_NAME: z
    .string()
    .default("BeforeListed - Renter-Agent Connection Platform"),
  BASE_URL: z.string().default("/api/v1"),
  PORT: z.coerce.number().default(3000),
  MONGO_URI: z.url().nonempty("MONGO_URI is required"),
  JWT_SECRET: z.string().default("lp01yPo31ACozd4pDI9Z1DSD30A"),
  JWT_REFRESH_SECRET: z.string().default("rwN17KgtvujqVe6jANmu3r5FIFY0jw"),
  JWT_EXPIRY: z.string(),
  JWT_REFRESH_EXPIRY: z.string(),
  SALT_ROUNDS: z.coerce.number().default(12),

  // ============================================
  // SMTP CONFIGURATION
  // ============================================
  // ============================================
  // EMAIL SETTINGS
  // ============================================
  SMTP_HOST: z.string().nonempty("SMTP_HOST is required"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().nonempty("SMTP_USERNAME is required"),
  SMTP_PASS: z.string().nonempty("SMTP_PASSWORD is required"),
  SMTP_FROM_EMAIL: z.string().nonempty("SMTP_FROM_EMAIL is required"),
  SMTP_FROM_NAME: z.string().default("BeforeListed"),

  // ============================================
  //  EMAIL DEFAULTS
  // ============================================
  EMAIL_FROM_NAME: z.string().default("BeforeListed"),
  EMAIL_FROM_ADDRESS: z
    .email("Must be a valid email")
    .default("noreply@beforelisted.com"),
  EMAIL_REPLY_TO: z.email("Must be a valid email").optional(),

  // ============================================
  //  BRANDING
  // ============================================
  EMAIL_LOGO_URL: z
    .url("Must be valid URL")
    .default("https://i.postimg.cc/wB4Zgqmy/Logo-8.jpg"),
  EMAIL_BRAND_COLOR: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color")
    .default("#1890FF"),

  EMAIL_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(3),
  EMAIL_RETRY_DELAY_MS: z.coerce.number().int().min(1000).default(1000),

  //  S3
  HETZNER_BUCKET_NAME: z.string().nonempty("Hetzner bucket name is required."),
  HETZNER_S3_ENDPOINT: z.string().nonempty("Hetzner s3 endpoint is required."),
  HETZNER_ACCESS_KEY: z.string().nonempty("Hetzner access key is required."),
  HETZNER_SECRET_KEY: z.string().nonempty("Hetzner secret key is required."),
  HETZNER_REGION: z.string().nonempty("Hetzner region is required."),

  // # ============================================
  // # File Upload Configuration
  // # ============================================

  // Image upload limits
  MAX_IMAGE_SIZE: z
    .string()
    .transform(Number)
    .refine((val) => !isNaN(val) && val > 0, {
      message: "MAX_IMAGE_SIZE must be a valid number",
    }),
  ALLOWED_IMAGE_TYPES: z
    .string()
    .transform((val) => val.split(","))
    .refine((arr) => arr.length > 0, {
      message: "ALLOWED_IMAGE_TYPES must contain at least one type",
    }),
  // Excel upload limits
  MAX_EXCEL_SIZE: z
    .string()
    .transform(Number)
    .refine((val) => !isNaN(val) && val > 0, {
      message: "MAX_EXCEL_SIZE must be a valid number",
    }),
  // PDF upload limits
  MAX_PDF_SIZE: z
    .string()
    .transform(Number)
    .refine((val) => !isNaN(val) && val > 0, {
      message: "MAX_PDF_SIZE must be a valid number",
    }),

  //  firebase fcm config
  FIREBASE_PROJECT_ID: z.string().nonempty("Firebase project ID required."),
  FIREBASE_PRIVATE_KEY: z.string().nonempty("Firebase private key required."),
  FIREBASE_CLIENT_EMAIL: z.email().nonempty("Firebase client email required."),

  //  STRIPE CREDENTIALS
  STRIPE_SECRET_KEY: z.string().nonempty("Stripe secret key is required."),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .nonempty("Stripe webhook secret is required."),

  // Frontend URL
  CLIENT_URL: z.string().url().default("http://localhost:3000"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
});

try {
  // eslint-disable-next-line node/no-process-env
  envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error(
      "Missing environment variables:",
      error.issues.flatMap((issue) => issue.path)
    );
  } else {
    console.error(error);
  }
  process.exit(1);
}

// eslint-disable-next-line node/no-process-env
export const env = envSchema.parse(process.env);
