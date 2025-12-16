// file: src/modules/user/user.controller.ts

import { MESSAGES } from "@/constants/app.constants";
import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { NextFunction, Request, Response } from "express";
import { deleteUserSchema, updateUserSchema } from "./user.schema";
import { UserService } from "./user.service";

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
