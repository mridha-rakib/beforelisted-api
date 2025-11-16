import { z } from "zod";

export const UserRoles = [
  "SuperAdmin",
  "Admin",
  "Supervisor",
  "Counsellor",
  "Clinician",
] as const;

export const UserRoleEnum = z.enum(UserRoles);

const emailSchema = z.email("Invalid email format").toLowerCase().trim();
const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters");

export const userSchemaGeneric = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: emailSchema,
  password: passwordSchema,
  role: UserRoleEnum,
  phoneNumber: z.string().optional(),
  createdBy: z
    .string()
    .refine((val) => !!val, { message: "createdBy is required" }),
});

// For endpoint: prevent creating 'SuperAdmin'
const restrictSuperAdmin = (schema: z.ZodObject<any>) =>
  schema.refine((obj) => obj.role !== "SuperAdmin", {
    message: "SuperAdmin cannot be created by this endpoint",
    path: ["role"],
  });

export const createUserSchema = z.object({
  body: restrictSuperAdmin(userSchemaGeneric),
});

export const updateUserSchema = z.object({
  body: userSchemaGeneric.partial().extend({
    createdBy: z.undefined(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

// Verify reset code schema
export const verifyResetCodeSchema = z.object({
  body: z.object({
    email: emailSchema,
    resetCode: z
      .string()
      .min(4, "Reset code must be 4 digits")
      .max(4, "Reset code must be 4 digits"),
  }),
});

// Reset password schema
export const resetPasswordSchema = z
  .object({
    body: z.object({
      email: emailSchema,
      resetCode: z
        .string()
        .min(4, "Reset code must be 4 digits")
        .max(4, "Reset code must be 4 digits"),
      newPassword: passwordSchema,
      confirmPassword: passwordSchema,
    }),
  })
  .refine((data) => data.body.newPassword === data.body.confirmPassword, {
    message: "Passwords don't match",
    path: ["body", "confirmPassword"],
  });

export const getUsersSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    role: z.enum(["Admin", "Supervisor", "Counsellor", "Clinician"]).optional(),
    search: z.string().optional(),
  }),
});

export const getUserByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, "User ID is required"),
  }),
});

export const adminUpdateUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).optional(),
    email: z.string().email().toLowerCase().optional(),
    role: z.enum(["Admin", "Supervisor", "Counsellor", "Clinician"]).optional(),
    phoneNumber: z.string().optional(),
    zoomMeetingLink: z.string().url().optional().or(z.literal("")),
  }),
  params: z.object({
    id: z.string().min(1, "User ID is required"),
  }),
});

export const deleteUserSchema = z.object({
  params: z.object({
    id: z.string().min(1, "User ID is required"),
  }),
});

// Get own profile
export const getProfileSchema = z.object({});

// Update own profile
export const updateProfileSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).optional(),
    phoneNumber: z.string().optional(),
    zoomMeetingLink: z.string().url().optional().or(z.literal("")),
  }),
});

// Change own password
export const changePasswordSchema = z
  .object({
    body: z.object({
      currentPassword: z.string().min(6),
      newPassword: z.string().min(6),
      confirmPassword: z.string().min(6),
    }),
  })
  .refine((data) => data.body.newPassword === data.body.confirmPassword, {
    message: "Passwords don't match",
    path: ["body", "confirmPassword"],
  });
