import { z } from "zod";
import { BLOCKED_EMAIL_REASONS } from "./blocked-email.type";

export const createBlockedEmailSchema = z.object({
  body: z.object({
    email: z.string().trim().email("A valid email address is required"),
    reason: z.enum(BLOCKED_EMAIL_REASONS),
  }),
});

export const listBlockedEmailSchema = z.object({
  query: z.object({
    status: z.enum(["active", "removed"]).optional(),
  }),
});

export const unblockEmailSchema = z.object({
  params: z.object({
    id: z.string().min(24, "Invalid blocked email ID"),
  }),
});
