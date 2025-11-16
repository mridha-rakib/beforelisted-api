import { HTTPSTATUS } from "@/config/http.config";
import { ErrorCodeEnum } from "@/enums/error-code.enum";
import { env } from "@/env";
import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { logger } from "@/middlewares/pino-logger";
import { zParse } from "@/utils/validators.utils";
import type { NextFunction, Request, Response } from "express";
import {
  adminUpdateUserSchema,
  changePasswordSchema,
  createUserSchema,
  deleteUserSchema,
  forgotPasswordSchema,
  getUserByIdSchema,
  getUsersSchema,
  loginSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyResetCodeSchema,
} from "./user.schema";
import { UserService } from "./user.service";
import {
  AdminUpdateUserInput,
  ChangePasswordInput,
  CreateUserInput,
  DeleteUserInput,
  ForgotPasswordInput,
  GetUserByIdInput,
  GetUsersInput,
  LoginInput,
  ResetPasswordInput,
  UpdateProfileInput,
  VerifyResetCodeInput,
} from "./user.type";
import { UserUtility } from "./user.utils";

export class UserController {
  private userService = new UserService();

  //
  // updateFCMToken = asyncHandler(
  //   async (req: Request, res: Response, _next: NextFunction) => {
  //     const userId = req.user!.userId;
  //     const { fcmToken } = req.body;

  //     if (!fcmToken) {
  //       return res
  //         .status(400)
  //         .json({ success: false, message: "FCM token required" });
  //     }

  //     await this.userService.updateFCMToken(userId, fcmToken);
  //     res.status(200).json({ success: true, message: "FCM token updated" });
  //   }
  // );

  login = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { body }: LoginInput = await zParse(loginSchema, req);
      const result = await this.userService.login(body);

      res.cookie("jwt", result.data.refreshToken, {
        httpOnly: true,
        // secure: env.NODE_ENV === "production",
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(HTTPSTATUS.OK).json(result);
    }
  );

  createUser = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      req.body.createdBy = req.user!.userId;
      const { body }: CreateUserInput = await zParse(createUserSchema, req);
      const createdByUserId = req.user!.userId;

      const result = await this.userService.createUser(body, createdByUserId);

      res.status(HTTPSTATUS.CREATED).json(result);
    }
  );

  forgotPassword = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { body }: ForgotPasswordInput = await zParse(
        forgotPasswordSchema,
        req
      );

      const result = await this.userService.forgotPassword(body);

      res.status(HTTPSTATUS.OK).json(result);
    }
  );

  verifyResetCode = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { body }: VerifyResetCodeInput = await zParse(
        verifyResetCodeSchema,
        req
      );
      const result = await this.userService.verifyResetCode(body);

      res.status(HTTPSTATUS.OK).json(result);
    }
  );

  resetPassword = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { body }: ResetPasswordInput = await zParse(
        resetPasswordSchema,
        req
      );

      const result = await this.userService.resetPassword(body);

      res.status(HTTPSTATUS.OK).json(result);
    }
  );

  refreshToken = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      let refreshToken = req.cookies?.jwt;
      if (!refreshToken && req.headers.authorization?.startsWith("Bearer ")) {
        refreshToken = req.headers.authorization.split(" ")[1];
      }

      if (!refreshToken) {
        return res.status(HTTPSTATUS.UNAUTHORIZED).json({
          success: false,
          message: "Refresh token is required",
          errorCode: ErrorCodeEnum.AUTH_TOKEN_NOT_FOUND,
        });
      }

      const userUtility = new UserUtility();
      const result = await userUtility.refreshToken(refreshToken);

      // Optionally update the cookie with new refresh token
      res.cookie("jwt", result.data.refreshToken, {
        httpOnly: true,
        // secure: env.NODE_ENV === "production",
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const responseData = {
        ...result,
        data: {
          accessToken: result.data.accessToken, // include only what you need
        },
      };

      res.status(HTTPSTATUS.OK).json(responseData);
    }
  );

  logout = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      res.clearCookie("jwt", {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
      });
      res.status(HTTPSTATUS.OK).json({
        success: true,
        message: "Logged out successfully",
      });
    }
  );

  getAllUsers = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { query }: GetUsersInput = await zParse(getUsersSchema, req);

      const requestingUserId = req.user!.userId;
      const requestingUserRole = req.user!.role;

      const result = await this.userService.getAllUsers(
        query,
        requestingUserId,
        requestingUserRole
      );

      res.status(HTTPSTATUS.OK).json(result);
    }
  );

  getUserById = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { params }: GetUserByIdInput = await zParse(getUserByIdSchema, req);

      const requestingUserRole = req.user!.role;

      const result = await this.userService.getUserById(
        params.id,
        requestingUserRole
      );

      res.status(HTTPSTATUS.OK).json(result);
    }
  );

  adminUpdateUser = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { body, params }: AdminUpdateUserInput = await zParse(
        adminUpdateUserSchema,
        req
      );

      const requestingUserId = req.user!.userId;
      const requestingUserRole = req.user!.role;

      const result = await this.userService.adminUpdateUser(
        params.id,
        body,
        requestingUserId,
        requestingUserRole
      );

      res.status(HTTPSTATUS.OK).json(result);
    }
  );

  deleteUser = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { params }: DeleteUserInput = await zParse(deleteUserSchema, req);

      const requestingUserId = req.user!.userId;
      const requestingUserRole = req.user!.role;

      const result = await this.userService.deleteUser(
        params.id,
        requestingUserId,
        requestingUserRole
      );

      res.status(HTTPSTATUS.OK).json(result);
    }
  );

  getProfile = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const userId = req.user!.userId;

      const result = await this.userService.getProfile(userId);

      res.status(HTTPSTATUS.OK).json(result);
    }
  );

  updateProfile = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { body }: UpdateProfileInput = await zParse(
        updateProfileSchema,
        req
      );

      const userId = req.user!.userId;

      const result = await this.userService.updateProfile(userId, body);

      res.status(HTTPSTATUS.OK).json(result);
    }
  );

  changePassword = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { body }: ChangePasswordInput = await zParse(
        changePasswordSchema,
        req
      );

      logger.warn({ body }, "Change password request body");
      const userId = req.user!.userId;

      logger.info(`User ${userId} is changing password`);

      const result = await this.userService.changePassword(userId, body);

      logger.info(
        { result },
        `Password changed for user ${userId} successfully`
      );

      res.status(HTTPSTATUS.OK).json(result);
    }
  );

  uploadProfileImageToS3 = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const userId = req.user!.userId;
      const file = req.file as any;

      if (!file || !file.location) {
        return res
          .status(400)
          .json({ success: false, message: "No image uploaded" });
      }

      await this.userService.updateProfileImage(userId, file.location);
      res.status(200).json({
        success: true,
        imageUrl: file.location,
        message: "Profile image uploaded and saved!",
      });
    }
  );

  // Additional controller methods
  updateFCMToken = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const userId = req.user!.userId;
      const { fcmToken } = req.body;

      if (!fcmToken) {
        return res
          .status(400)
          .json({ success: false, message: "FCM token required" });
      }

      await this.userService.updateFCMToken(userId, fcmToken);
      res.status(200).json({ success: true, message: "FCM token updated" });
    }
  );
}



