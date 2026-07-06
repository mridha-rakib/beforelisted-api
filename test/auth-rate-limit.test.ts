import express, { type Router } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/modules/auth/auth.controller", () => ({
  AuthController: class {
    login = vi.fn();
    verifyEmail = vi.fn();
    resendVerificationCode = vi.fn();
    verifyOTP = vi.fn();
    refreshToken = vi.fn();
    changePassword = vi.fn();
    logout = vi.fn();
  },
}));

vi.mock("../src/modules/password/password.controller", () => ({
  PasswordResetController: class {
    requestPasswordReset = vi.fn();
    verifyPasswordOTP = vi.fn();
    resetPassword = vi.fn();
    resendPasswordOTP = vi.fn();
  },
}));

import { authLimiter } from "../src/middlewares/rate-limit.middleware";
import authRouter from "../src/modules/auth/auth.route";
import passwordResetRouter from "../src/modules/password/password.route";

function routeUsesAuthLimiter(router: Router, path: string) {
  const routeLayer = router.stack.find(layer => layer.route?.path === path);

  return routeLayer?.route?.stack.some(
    layer => layer.handle === authLimiter,
  ) ?? false;
}

describe("authentication rate limiting", () => {
  it("is attached only to login, OTP verification, and OTP resend routes", () => {
    for (const path of [
      "/admin/login",
      "/login",
      "/verify-email",
      "/verify-otp",
      "/resend-verification",
    ]) {
      expect(routeUsesAuthLimiter(authRouter, path), path).toBe(true);
    }

    for (const path of ["/verify-password-otp", "/resend-password-otp"]) {
      expect(routeUsesAuthLimiter(passwordResetRouter, path), path).toBe(true);
    }

    expect(routeUsesAuthLimiter(authRouter, "/refresh-token")).toBe(false);
    expect(routeUsesAuthLimiter(passwordResetRouter, "/reset-password")).toBe(
      false,
    );
  });

  it("blocks repeated auth requests without affecting an unrelated route", async () => {
    const app = express();

    app.post("/auth/login", authLimiter, (_req, res) => {
      res.sendStatus(204);
    });
    app.get("/public", (_req, res) => {
      res.sendStatus(204);
    });

    for (let attempt = 0; attempt < 100; attempt += 1) {
      await request(app).post("/auth/login").expect(204);
    }

    await request(app).post("/auth/login").expect(429);
    await request(app).get("/public").expect(204);
  });
});
