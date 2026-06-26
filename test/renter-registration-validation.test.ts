import { describe, expect, it } from "vitest";

import { MESSAGES } from "../src/constants/app.constants";
import { agentReferralRenterRegisterSchema } from "../src/modules/renter/renter.schema";

describe("renter registration validation", () => {
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
