import { z } from "zod/v4";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  APP_NAME: z
    .string()
    .default("Southern Change Behavioral Health Services - SCBHS"),
  BASE_URL: z.string().default("/api/v1"),
  PORT: z.coerce.number().default(3000),
  MONGO_URI: z.url().nonempty("MONGO_URI is required"),
  JWT_SECRET: z.string().default("lp01yPo31ACozd4pDI9Z1DSD30A"),
  JWT_REFRESH_SECRET: z.string().default("rwN17KgtvujqVe6jANmu3r5FIFY0jw"),
  JWT_EXPIRY: z.string(),
  JWT_REFRESH_EXPIRY: z.string(),
  SALT_ROUNDS: z.coerce.number().default(12),
  // Node Mailer
  SMTP_HOST: z.string().nonempty("SMTP_HOST is required"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USERNAME: z.string().nonempty("SMTP_USERNAME is required"),
  SMTP_PASSWORD: z.string().nonempty("SMTP_PASSWORD is required"),
  SMTP_FROM_EMAIL: z.string().nonempty("SMTP_FROM_EMAIL is required"),

  // AWS S3
  AWS_ACCESS_KEY_ID: z.string().nonempty("AWS_ACCESS_KEY_ID is required"),
  AWS_SECRET_ACCESS_KEY: z
    .string()
    .nonempty("AWS_SECRET_ACCESS_KEY is required"),
  AWS_REGION: z.string().nonempty("AWS_REGION is required"),
  AWS_PROFILE_IMAGES_BUCKET: z
    .string()
    .nonempty("AWS_PROFILE_IMAGES_BUCKET is required"),

  //  firebase fcm config
  FIREBASE_PROJECT_ID: z.string().nonempty("Firebase project ID required."),
  FIREBASE_PRIVATE_KEY: z.string().nonempty("Firebase private key required."),
  FIREBASE_CLIENT_EMAIL: z.email().nonempty("Firebase client email required."),

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
