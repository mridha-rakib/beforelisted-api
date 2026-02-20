// file: src/modules/user/user.controller.ts

import { MESSAGES } from "@/constants/app.constants";
import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { NextFunction, Request, Response } from "express";
import { updateUserSchema } from "./user.schema";
import { UserService } from "./user.service";

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  
  getProfile = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user!.userId;
      const result = await this.userService.getUserProfile(userId);

      ApiResponse.success(res, result, "Profile retrieved successfully");
    }
  );

 
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


  deleteAccount = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user!.userId;

      const result = await this.userService.deleteUserAccount(userId);

      ApiResponse.success(res, result);
    }
  );

  
  adminGetUser = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { userId } = req.params;

      const result = await this.userService.adminGetUser(userId);

      ApiResponse.success(res, result, "User retrieved successfully");
    }
  );

  

  
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

  getReferralLink = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user!.userId;
      const stats = await this.userService.getReferralStats(userId);

      ApiResponse.success(
        res,
        {
          referralCode: stats.referralCode,
          referralLink: stats.referralLink,
          loginLink: stats.loginLink,
          totalReferrals: stats.totalReferrals,
        },
        "Referral information retrieved successfully"
      );
    }
  );
}
