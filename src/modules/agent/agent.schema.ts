// file: src/modules/agent/agent.schema.ts

import { z } from "zod";


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


export const createAgentProfileSchema = z.object({
  body: z.object({
    licenseNumber: z.string().min(1, "License number is required").max(100),
    brokerageName: z.string().min(1, "Brokerage name is required").max(100),
  }),
});


export const updateAgentProfileSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).max(100).optional(),
    phoneNumber: z.string().optional(),
    licenseNumber: z.string().min(1).max(100).optional(),
    brokerageName: z.string().min(1).max(100).optional(),
    emailSubscriptionEnabled: z.boolean().optional(),
  }),
});


export const getAgentProfileSchema = z.object({
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
