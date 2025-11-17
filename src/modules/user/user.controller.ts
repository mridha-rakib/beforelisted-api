// file: src/modules/user/user.controller.ts

import { MESSAGES } from "@/constants/app.constants";
import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { NextFunction, Request, Response } from "express";
import {
  adminUpdateUserSchema,
  changeEmailSchema,
  changePasswordSchema,
  deleteUserSchema,
  listUsersSchema,
  updateUserSchema,
  verifyNewEmailSchema,
} from "./user.schema";
import { UserService } from "./user.service";

/**
 * User Controller
 * Handles HTTP requests for user operations
 */
export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Get authenticated user's profile
   * GET /user/profile
   */
  getProfile = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user!.userId;
      const result = await this.userService.getUserProfile(userId);

      ApiResponse.success(res, result, "Profile retrieved successfully");
    }
  );

  /**
   * Update authenticated user's profile
   * PUT /user/profile
   */
  updateProfile = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(updateUserSchema, req);
      const userId = req.user!.userId;

      const result = await this.userService.updateUserProfile(
        userId,
        validated.body
      );

      ApiResponse.success(res, result, MESSAGES.USER.USER_UPDATED);
    }
  );

  /**
   * Request email change (send verification)
   * POST /user/change-email
   */
  requestEmailChange = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(changeEmailSchema, req);
      const userId = req.user!.userId;

      const result = await this.userService.requestEmailChange(
        userId,
        validated.body.newEmail
      );

      ApiResponse.success(res, result);
    }
  );

  /**
   * Verify new email
   * POST /user/verify-new-email
   */
  verifyNewEmail = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(verifyNewEmailSchema, req);
      const userId = req.user!.userId;

      const result = await this.userService.verifyNewEmail(
        userId,
        validated.body.newEmail,
        validated.body.verificationCode
      );

      ApiResponse.success(res, result);
    }
  );

  /**
   * Change password
   * POST /user/change-password
   */
  changePassword = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(changePasswordSchema, req);
      const userId = req.user!.userId;

      const result = await this.userService.changePassword(
        userId,
        validated.body
      );

      ApiResponse.success(res, result);
    }
  );

  /**
   * Delete user account (soft delete)
   * DELETE /user
   */
  deleteAccount = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user!.userId;

      const result = await this.userService.deleteUserAccount(userId);

      ApiResponse.success(res, result);
    }
  );

  /**
   * ADMIN: Get user by ID
   * GET /user/:userId
   */
  adminGetUser = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { userId } = req.params;

      const result = await this.userService.adminGetUser(userId);

      ApiResponse.success(res, result, "User retrieved successfully");
    }
  );

  /**
   * ADMIN: List all users (with pagination and filters)
   * GET /user
   */
  adminListUsers = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(listUsersSchema, req);
      const { page, limit, search, role, accountStatus, sort } =
        validated.query;

      const result = await this.userService.adminListUsers(
        page,
        limit,
        search,
        role,
        accountStatus,
        sort
      );

      ApiResponse.paginated(
        res,
        result.data,
        result.pagination,
        "Users retrieved successfully"
      );
    }
  );

  /**
   * ADMIN: Update user
   * PUT /user/:userId
   */
  adminUpdateUser = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(adminUpdateUserSchema, req);
      const { userId } = req.params;

      const result = await this.userService.adminUpdateUser(
        userId,
        validated.body
      );

      ApiResponse.success(res, result, MESSAGES.USER.USER_UPDATED);
    }
  );

  /**
   * ADMIN: Delete user (soft delete)
   * DELETE /user/:userId
   */
  adminDeleteUser = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const validated = await zParse(deleteUserSchema, req);
      const { userId } = validated.params;
      const deletedBy = req.user!.userId;

      const result = await this.userService.adminDeleteUser(userId, deletedBy);

      ApiResponse.success(res, result);
    }
  );

  /**
   * ADMIN: Restore soft-deleted user
   * POST /user/:userId/restore
   */
  adminRestoreUser = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { userId } = req.params;

      const result = await this.userService.adminRestoreUser(userId);

      ApiResponse.success(res, result, "User restored successfully");
    }
  );

  /**
   * ADMIN: Permanently delete user (hard delete)
   * DELETE /user/:userId/permanent
   */
  adminPermanentlyDeleteUser = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { userId } = req.params;

      const result = await this.userService.adminPermanentlyDeleteUser(userId);

      ApiResponse.success(res, result);
    }
  );
}
