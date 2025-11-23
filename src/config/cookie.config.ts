// file: src/config/cookie.config.ts

import { env } from "@/env";

/**
 * Cookie configuration for refresh tokens
 */
export const COOKIE_CONFIG = {
  REFRESH_TOKEN: {
    name: "refreshToken",
    options: {
      httpOnly: true, // Prevents XSS attacks
      secure: env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "strict" as const, // CSRF protection
      path: "/", // Available across all routes
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
    },
  },
} as const;
