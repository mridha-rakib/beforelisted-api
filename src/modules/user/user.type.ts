import type { z } from "zod";
import {
  adminUpdateUserSchema,
  changePasswordSchema,
  createUserSchema,
  deleteUserSchema,
  forgotPasswordSchema,
  getProfileSchema,
  getUserByIdSchema,
  getUsersSchema,
  loginSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyResetCodeSchema,
} from "./user.schema";

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyResetCodeInput = z.infer<typeof verifyResetCodeSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type GetUsersInput = z.infer<typeof getUsersSchema>;
export type GetUserByIdInput = z.infer<typeof getUserByIdSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type DeleteUserInput = z.infer<typeof deleteUserSchema>;
export type GetProfileInput = z.infer<typeof getProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
