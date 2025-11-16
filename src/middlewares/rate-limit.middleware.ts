import rateLimit from "express-rate-limit";
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: "Too many requests from this IP",
  standardHeaders: true,
  legacyHeaders: false,
});

// For auth endpoints (stricter)
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 failed attempts
  skipSuccessfulRequests: true,
  message: "Too many login attempts, please try again later",
});
