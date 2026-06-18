// file: src/env.ts
import { z } from "zod/v4";

const envSchema = z.object({
  // Runtime mode for feature flags and safety checks; set by the hosting platform or local .env.
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  // Display name used in app metadata and logs; choose internally for the deployment.
  APP_NAME: z
    .string()
    .default("BeforeListed - Renter-Agent Connection Platform"),
  // API route prefix mounted by Express; choose internally and keep clients/docs in sync.
  BASE_URL: z.string().default("/api/v1"),
  // HTTP port the API listens on; set by the host, process manager, or local dev setup.
  PORT: z.coerce.number().default(3000),
  // MongoDB connection string; get it from MongoDB Atlas or the managed MongoDB server.
  MONGO_URI: z.url().nonempty("MONGO_URI is required"),
  // Secret for signing short-lived JWT access tokens; generate with a secure random secret manager.
  JWT_SECRET: z.string().nonempty("JWT_SECRET is required"),
  // Secret for signing refresh tokens; generate separately from JWT_SECRET in a secret manager.
  JWT_REFRESH_SECRET: z.string().nonempty("JWT_REFRESH_SECRET is required"),
  // Access token lifetime such as 15m or 7d; choose according to the auth security policy.
  JWT_EXPIRY: z.string(),
  // Refresh token lifetime such as 30d; choose according to the auth security policy.
  JWT_REFRESH_EXPIRY: z.string(),
  // bcrypt password hashing cost factor; choose internally, usually 10-14 depending on server capacity.
  SALT_ROUNDS: z.coerce.number().default(12),

  // Postmark server API token for sending email; get it from the Postmark server credentials page.
  POSTMARK_API_TOKEN: z.string().nonempty("POSTMARK_API_TOKEN is required"),
  // Postmark message stream name; get it from Postmark, usually outbound for transactional mail.
  POSTMARK_MESSAGE_STREAM: z
    .enum(["outbound", "broadcast"])
    .default("outbound"),
  // Enables Postmark sandbox behavior outside production; set locally when testing email delivery.
  POSTMARK_SANDBOX_MODE: z.coerce.boolean().default(false),

  // Sender display name for outbound emails; choose internally to match the product brand.
  EMAIL_FROM_NAME: z.string().default("BeforeListed"),
  // Verified sender email address; get it from a verified sender/domain in Postmark.
  EMAIL_FROM_ADDRESS: z
    .email("Must be a valid email")
    .default("noreply@beforelisted.com"),
  // Optional reply-to email for outbound emails; use a monitored support inbox if different from sender.
  EMAIL_REPLY_TO: z.email("Must be a valid email").optional(),

  // Email logo URL or CID attachment reference; use an HTTPS asset URL or the bundled CID value.
  EMAIL_LOGO_URL: z.string().default("cid:beforelisted-email-logo.png"),
  // Primary email brand color as a hex value; choose from the product design system.
  EMAIL_BRAND_COLOR: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color")
    .default("#1890FF"),

  // Maximum email send retry attempts; choose internally based on Postmark retry tolerance.
  EMAIL_MAX_RETRIES: z.coerce.number().int(),
  // Delay between email retry attempts in milliseconds; choose internally with Postmark rate limits in mind.
  EMAIL_RETRY_DELAY_MS: z.coerce.number().int(),

  // Hetzner Object Storage bucket for uploads; get it from the Hetzner Cloud object storage console.
  HETZNER_BUCKET_NAME: z.string().nonempty("Hetzner bucket name is required."),
  // Hetzner S3-compatible endpoint URL; get it from the bucket region details in Hetzner Cloud.
  HETZNER_S3_ENDPOINT: z.string().nonempty("Hetzner s3 endpoint is required."),
  // Hetzner Object Storage access key; create it in Hetzner Cloud credentials.
  HETZNER_ACCESS_KEY: z.string().nonempty("Hetzner access key is required."),
  // Hetzner Object Storage secret key; create it with the access key and store it only in secrets.
  HETZNER_SECRET_KEY: z.string().nonempty("Hetzner secret key is required."),
  // Hetzner Object Storage region identifier; get it from the bucket region, such as eu-central.
  HETZNER_REGION: z.string().nonempty("Hetzner region is required."),

  // Maximum uploaded image size in bytes; choose internally based on product upload limits.
  MAX_IMAGE_SIZE: z
    .string()
    .transform(Number)
    .refine(val => !isNaN(val) && val > 0, {
      message: "MAX_IMAGE_SIZE must be a valid number",
    }),
  // Comma-separated allowed image MIME types; choose internally based on supported upload formats.
  ALLOWED_IMAGE_TYPES: z
    .string()
    .transform(val => val.split(","))
    .refine(arr => arr.length > 0, {
      message: "ALLOWED_IMAGE_TYPES must contain at least one type",
    }),

  // Maximum uploaded spreadsheet size in bytes; choose internally based on product upload limits.
  MAX_EXCEL_SIZE: z
    .string()
    .transform(Number)
    .refine(val => !isNaN(val) && val > 0, {
      message: "MAX_EXCEL_SIZE must be a valid number",
    }),

  // Maximum uploaded PDF size in bytes; choose internally based on product upload limits.
  MAX_PDF_SIZE: z
    .string()
    .transform(Number)
    .refine(val => !isNaN(val) && val > 0, {
      message: "MAX_PDF_SIZE must be a valid number",
    }),

  // Platform administrator email; use the monitored admin/support account for this environment.
  ADMIN_EMAIL: z.email().nonempty("Admin email is required."),

  // Stripe secret API key for payment operations; get it from the Stripe dashboard for this environment.
  STRIPE_SECRET_KEY: z.string().nonempty("Stripe secret key is required."),
  // Stripe webhook signing secret for this API endpoint; get it from the Stripe webhook endpoint settings.
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .nonempty("Stripe webhook secret is required."),

  // Public frontend base URL used in links, redirects, and CORS; set to the deployed frontend domain.
  CLIENT_URL: z.string().url().default("https://beforelisted.com"),
  // Optional comma-separated additional frontend origins for CORS, such as ngrok dev URLs.
  CORS_ORIGINS: z.string().optional(),
  // Public API base URL including BASE_URL, used for email links that must record state immediately.
  PUBLIC_API_BASE_URL: z.string().url().optional(),
  // Pino log verbosity; choose per environment, usually info in production and debug locally.
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  // Enables in-process scheduled jobs. Keep false in local development when using production services.
  ENABLE_SCHEDULED_JOBS: z
    .enum(["true", "false"])
    .transform(value => value === "true")
    .optional(),
});

const requiredJwtKeys = ["JWT_SECRET", "JWT_REFRESH_SECRET"] as const;

function normalizeEnv(rawEnv: NodeJS.ProcessEnv): Record<string, string | undefined> {
  const normalized: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(rawEnv)) {
    if (typeof value !== "string") {
      normalized[key] = value as undefined;
      continue;
    }

    const trimmed
      = (value.startsWith("\"") && value.endsWith("\""))
        || (value.startsWith("'") && value.endsWith("'"))
        ? value.slice(1, -1)
        : value;

    normalized[key]
      = key === "EMAIL_LOGO_URL"
        ? trimmed
            .replace(/^(["']|%22|%27)+/, "")
            .replace(/(["']|%22|%27)+$/, "")
        : trimmed;
  }

  return normalized;
}

const parsedEnv = normalizeEnv(process.env);

try {
  if (parsedEnv.NODE_ENV === "production") {
    const missingJwtKeys = requiredJwtKeys.filter(key => !parsedEnv[key]);
    if (missingJwtKeys.length > 0) {
      throw new Error(
        `Missing required JWT env vars in production: ${missingJwtKeys.join(
          ", ",
        )}`,
      );
    }
  }

  envSchema.parse(parsedEnv);
}
catch (error) {
  if (error instanceof z.ZodError) {
    console.error(
      "Missing environment variables:",
      error.issues.flatMap(issue => issue.path),
    );
  }
  else {
    console.error(error);
  }
  process.exit(1);
}

export const env = envSchema.parse(parsedEnv);
