// file: src/modules/agent/agent.schema.ts

import { z } from "zod";

/**
 * Agent registration validation (POST /agent/register)
 * This is used for agent-specific fields AFTER user is created
 */
export const agentRegisterSchema = z.object({
  body: z.object({
    // User fields (will be passed to auth)
    fullName: z.string().min(2).max(100),
    phoneNumber: z.string().optional(),
    email: z.email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),

    // Agent-specific fields
    licenseNumber: z.string().min(1, "License number is required").max(50),
    brokerageName: z.string().min(1, "Brokerage name is required").max(100),
  }),
});

/**
 * Create agent profile validation (INTERNAL - after user exists)
 */
export const createAgentProfileSchema = z.object({
  body: z.object({
    licenseNumber: z.string().min(1, "License number is required").max(50),
    brokerageName: z.string().min(1, "Brokerage name is required").max(100),
  }),
});

/**
 * Update agent profile validation
 */
export const updateAgentProfileSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(100).optional(),
    brokerageName: z.string().min(1).max(100).optional(),
  }),
});

/**
 * Get agent profile validation (params)
 */
export const getAgentProfileSchema = z.object({
  params: z.object({
    userId: z.string().min(1, "User ID is required"),
  }),
});

/**
 * Admin approve agent validation
 */
export const adminApproveAgentSchema = z.object({
  params: z.object({
    userId: z.string().min(1, "User ID is required"),
  }),
  body: z.object({
    adminNotes: z.string().max(500).optional(),
  }),
});

/**
 * Admin suspend agent validation
 */
export const adminSuspendAgentSchema = z.object({
  params: z.object({
    userId: z.string().min(1, "User ID is required"),
  }),
  body: z.object({
    suspensionReason: z
      .string()
      .min(1, "Suspension reason is required")
      .max(500),
  }),
});

/**
 * Admin unsuspend agent validation
 */
export const adminUnsuspendAgentSchema = z.object({
  params: z.object({
    userId: z.string().min(1, "User ID is required"),
  }),
});

/**
 * Admin verify agent validation
 */
export const adminVerifyAgentSchema = z.object({
  params: z.object({
    userId: z.string().min(1, "User ID is required"),
  }),
});

export const agentToggleActiveSchema = z.object({
  params: z.object({
    userId: z.string().min(24),
  }),
  body: z
    .object({
      reason: z.string().optional(),
    })
    .optional(),
});
