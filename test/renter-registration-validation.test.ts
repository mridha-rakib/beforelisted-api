import { hash } from "bcryptjs";
import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { MESSAGES } from "../src/constants/app.constants.js";
import { errorHandler } from "../src/middlewares/error-handler.middleware.js";
import { AuthService } from "../src/modules/auth/auth.service.js";
import renterRouter from "../src/modules/renter/renter.route.js";
import { adminReferralRenterRegisterSchema, agentReferralRenterRegisterSchema, renterRegisterSchema } from "../src/modules/renter/renter.schema.js";
import { RenterService } from "../src/modules/renter/renter.service.js";

describe("renter registration validation", () => {
  it.each([
    [agentReferralRenterRegisterSchema, "AGT-ABCDEFGH", "password123"],
    [adminReferralRenterRegisterSchema, "ADM-ABCDEFGH", undefined],
    [renterRegisterSchema, "AGT-ABCDEFGH", "password123"],
    [renterRegisterSchema, "ADM-ABCDEFGH", undefined],
  ])("requires a valid phone in every registration path", async (schema, referralCode, password) => {
    const base = { email: "renter@example.invalid", password, fullName: "Riley Example", referralCode };
    for (const phoneNumber of [undefined, "", "   ", "abc", "123", "555123\n4567"]) {
      expect((await schema.safeParseAsync({ body: { ...base, phoneNumber } })).success).toBe(false);
    }
    expect((await schema.safeParseAsync({ body: { ...base, phoneNumber: "(555) 123-4567" } })).success).toBe(true);
  });
  it.each([
    [agentReferralRenterRegisterSchema, "AGT-ABCDEFGH", "password123"],
    [adminReferralRenterRegisterSchema, "ADM-ABCDEFGH", undefined],
    [renterRegisterSchema, "AGT-ABCDEFGH", "password123"],
    [renterRegisterSchema, "ADM-ABCDEFGH", undefined],
  ])("requires two name words for each referral registration", async (schema, referralCode, password) => {
    const body = { email: "renter@example.invalid", password, phoneNumber: "5551234567", referralCode };
    for (const fullName of ["", "  ", "Riley", "  Riley  "])
      expect((await schema.safeParseAsync({ body: { ...body, fullName } })).success).toBe(false);
    for (const fullName of ["Riley Example", "  Riley   De Example ", "Riley De La Example", "Riley\tExample"])
      expect((await schema.safeParseAsync({ body: { ...body, fullName } })).success).toBe(true);
  });

  it.each([
    ["/register", "AGT-ABCDEFGH", "password123"],
    ["/register", "ADM-ABCDEFGH", undefined],
    ["/register/agent-referral", "AGT-ABCDEFGH", "password123"],
    ["/register/admin-referral", "ADM-ABCDEFGH", undefined],
  ])("enforces name and phone on the %s route", async (path, referralCode, password) => {
    const service = vi.spyOn(RenterService.prototype, "registerRenter").mockResolvedValue({ tokens: { refreshToken: "synthetic" } } as never);
    const app = express();
    app.use(express.json(), renterRouter, errorHandler);
    const body = { email: "renter@example.invalid", fullName: "Riley Example", phoneNumber: "5551234567", referralCode, password };
    await request(app).post(path).send({ ...body, fullName: "Riley" }).expect(400);
    await request(app).post(path).send({ ...body, phoneNumber: "" }).expect(400);
    expect(service).not.toHaveBeenCalled();
    await request(app).post(path).send({ ...body, fullName: "Riley De La Example" }).expect(201);
    expect(service).toHaveBeenCalledOnce();
    service.mockRestore();
  });

  it("allows a legacy single-word renter to log in without changing the name", async () => {
    const service = Object.create(AuthService.prototype) as any;
    const user = { _id: "507f1f77bcf86cd799439011", email: "legacy@example.invalid", fullName: "Riley", role: "Renter", emailVerified: true, accountStatus: "active", password: await hash("synthetic-password", 4) };
    service.blockedEmailService = { assertEmailNotBlocked: vi.fn().mockResolvedValue(undefined) };
    service.userService = { getUserByEmailWithPassword: vi.fn().mockResolvedValue(user), updateLastLogin: vi.fn().mockResolvedValue(undefined), toUserResponse: vi.fn().mockReturnValue({ fullName: user.fullName }) };
    service.renterRepository = { findRenterWithReferrer: vi.fn().mockResolvedValue({ registrationType: "normal", referredByAgentId: "synthetic" }) };
    service.generateTokens = vi.fn().mockReturnValue({ accessToken: "synthetic" });
    const result = await service.login({ email: user.email, password: "synthetic-password" });
    expect(result.user.fullName).toBe("Riley");
    expect(user.fullName).toBe("Riley");
  });

  it("returns the project password length message for short agent-referral passwords", async () => {
    const result = await agentReferralRenterRegisterSchema.safeParseAsync({
      body: {
        email: "renter@example.com",
        password: "1234567",
        fullName: "Renter User",
        phoneNumber: "5551234567",
        referralCode: "AGT-ABCDEFGH",
      },
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    const passwordIssue = result.error.issues.find(
      issue => issue.path.join(".") === "body.password",
    );

    expect(passwordIssue?.message).toBe(MESSAGES.VALIDATION.PASSWORD_TOO_SHORT);
  });
});
