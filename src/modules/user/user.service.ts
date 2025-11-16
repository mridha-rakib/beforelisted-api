import { UserRepository } from "./user.repository";

import { ErrorCodeEnum } from "@/enums/error-code.enum";
import { EmailService } from "@/mailers/services/email.service";
import { logger } from "@/middlewares/pino-logger";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "@/utils/app-error.utils";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { PasswordResetRepository } from "./password-reset.repository";
import { AuthResponse, JWTPayload } from "./user.interface";
import { IUser, UserRole } from "./user.model";
import {
  AdminUpdateUserInput,
  ChangePasswordInput,
  CreateUserInput,
  ForgotPasswordInput,
  GetUsersInput,
  LoginInput,
  ResetPasswordInput,
  UpdateProfileInput,
  VerifyResetCodeInput,
} from "./user.type";
import { UserUtility } from "./user.utils";

export class UserService {
  private repo = new UserRepository();
  private passwordResetRepo = new PasswordResetRepository();
  private emailService = new EmailService();
  private utility = new UserUtility();

  async login(loginInput: LoginInput["body"]): Promise<AuthResponse> {
    const { email, password } = loginInput;

    const user = await this.repo.findUserByEmail(email, true);

    const temUser = await this.repo.findAll();

    if (!user) {
      throw new NotFoundException(
        "User not found",
        ErrorCodeEnum.AUTH_USER_NOT_FOUND
      );
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      throw new BadRequestException(
        "Invalid credentials",
        ErrorCodeEnum.AUTH_INVALID_CREDENTIALS
      );
    }

    await this.repo.updateById(user._id.toString(), {
      lastLogin: new Date(),
    } as any);

    const tokenPayload: Omit<JWTPayload, "iat" | "exp"> = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const { accessToken, refreshToken } =
      this.utility.generateTokens(tokenPayload);

    return {
      success: true,
      data: {
        user: {
          _id: user._id.toString(),
          email: user.email,
          profileImage: user.profileImage!!,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
      message: "Login successful",
    };
  }

  //  create user
  async createUser(
    createUserData: CreateUserInput["body"],
    createdByUserId: string
  ): Promise<{
    success: boolean;
    data: Partial<IUser>;
    message: string;
  }> {
    const fullName = createUserData.fullName as string;
    const email = createUserData.email as string;
    const temporaryPassword = createUserData.password as string;
    const role = createUserData.role as UserRole;

    const existingUser = await this.repo.findUserByEmail(email as string);

    if (existingUser) {
      throw new ConflictException(
        "User with this email already exists",
        ErrorCodeEnum.AUTH_EMAIL_ALREADY_EXISTS
      );
    }

    const hashedPassword = await this.utility.hashPassword(
      temporaryPassword as string
    );

    // create user
    const userData = {
      fullName: fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role,
      createdBy: new Types.ObjectId(createdByUserId),
    } as any;

    const newUser = await this.repo.create(userData);

    try {
      await this.emailService.sendWelcomeEmail(
        email,
        fullName,
        temporaryPassword
      );
    } catch (err) {
      // Optional: handle/log error but do not throw, return success for API
      logger.error(err, `Failed to send welcome email to ${email}:`);
    }

    return {
      success: true,
      data: {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        phoneNumber: newUser.phoneNumber,
        createdAt: newUser.createdAt,
      },
      message: `${role} user created successfully`,
    };
  }

  // forgot password

  async forgotPassword(
    forgotPasswordData: ForgotPasswordInput["body"]
  ): Promise<{ success: boolean; message: string }> {
    const { email } = forgotPasswordData;

    const user = await this.repo.findUserByEmail(email);

    if (!user) {
      return {
        success: true,
        message:
          "If an account with that email exists, we've sent a password reset code.",
      };
    }

    // Generate 4-digit code
    const resetCode = Math.floor(1000 + Math.random() * 9000).toString();

    // Set expiration to 15 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Invalidate previous reset requests
    await this.passwordResetRepo.invalidateUserResetRequests(
      user._id.toString()
    );

    // create new reset request
    await this.passwordResetRepo.create({
      userId: user._id,
      email: user.email,
      resetCode,
      isUsed: false,
      expiresAt,
    } as any);

    // send email
    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        resetCode,
        user.fullName
      );
    } catch (error) {
      throw new BadRequestException(
        "Failed to send reset email",
        ErrorCodeEnum.INTERNAL_SERVER_ERROR
      );
    }

    return {
      success: true,
      message: "Password reset link sent if email exists",
    };
  }

  async verifyResetCode(
    verifyCodeData: VerifyResetCodeInput["body"]
  ): Promise<{ success: boolean; message: string }> {
    const { email, resetCode } = verifyCodeData;

    const resetRequest = await this.passwordResetRepo.findValidResetRequest(
      email,
      resetCode
    );

    if (!resetRequest) {
      throw new BadRequestException(
        "Invalid or expired reset code",
        ErrorCodeEnum.PASSWORD_RESET_CODE_INVALID
      );
    }

    return {
      success: true,
      message:
        "Reset code verified successfully. You can now set your new password.",
    };
  }

  async resetPassword(
    resetPasswordData: ResetPasswordInput["body"]
  ): Promise<{ success: boolean; message: string }> {
    const { email, resetCode, newPassword } = resetPasswordData;

    const resetRequest = await this.passwordResetRepo.findValidResetRequest(
      email,
      resetCode
    );

    if (!resetRequest) {
      throw new BadRequestException(
        "Invalid or expired reset code",
        ErrorCodeEnum.PASSWORD_RESET_CODE_INVALID
      );
    }

    // Find the user
    const user = await this.repo.findUserByEmail(email);

    if (!user) {
      throw new NotFoundException(
        "User not found",
        ErrorCodeEnum.AUTH_USER_NOT_FOUND
      );
    }

    const hashedPassword = await this.utility.hashPassword(newPassword);

    await this.repo.updateById(user._id.toString(), {
      password: hashedPassword,
    } as any);

    await this.passwordResetRepo.updateById(resetRequest._id.toString(), {
      isUsed: true,
    } as any);

    // Invalidate all other reset requests for this user
    await this.passwordResetRepo.invalidateUserResetRequests(
      user._id.toString()
    );

    return {
      success: true,
      message:
        "Password has been reset successfully. You can now login with your new password.",
    };
  }

  // async getAllUsers(
  //   filters: GetUsersInput["query"],
  //   requestingUserId: string,
  //   requestingUserRole: string
  // ): Promise<{
  //   success: boolean;
  //   data: Partial<IUser>[];
  //   pagination: any;
  //   message: string;
  // }> {
  //   if (!["Admin", "SuperAdmin"].includes(requestingUserRole)) {
  //     throw new UnauthorizedException(
  //       "Insufficient permissions",
  //       ErrorCodeEnum.ACCESS_UNAUTHORIZED
  //     );
  //   }

  //   const page = parseInt(filters.page || "1");
  //   const limit = parseInt(filters.limit || "10");

  //   const query: any = {};

  //   if (filters.role) {
  //     query.role = filters.role;
  //   }
  //   if (filters.search) {
  //     query.$or = [
  //       { fullName: { $regex: filters.search, $options: "i" } },
  //       { email: { $regex: filters.search, $options: "i" } },
  //     ];
  //   }

  //   // Use your mongoosePaginate plugin
  //   const paginateResult = await this.repo.paginateUsers(query, {
  //     page,
  //     limit,
  //     sort: { createdAt: -1 },
  //     populate: { path: "createdBy", select: "fullName email role" },
  //     lean: true,
  //   });

  //   return {
  //     success: true,
  //     data: Array.isArray(paginateResult.data)
  //       ? paginateResult.data.map((user: any) => ({
  //           _id: user._id,
  //           fullName: user.fullName,
  //           email: user.email,
  //           role: user.role,
  //           phoneNumber: user.phoneNumber,
  //           lastLogin: user.lastLogin,
  //           createdAt: user.createdAt,
  //           createdBy: user.createdBy,
  //         }))
  //       : [],
  //     pagination: paginateResult.pagination,
  //     message: "Users retrieved successfully",
  //   };
  // }

  async getAllUsers(
    filters: GetUsersInput["query"],
    requestingUserId: string,
    requestingUserRole: string
  ): Promise<{
    success: boolean;
    data: Partial<IUser>[];
    pagination: any;
    message: string;
  }> {
    if (!["Admin", "SuperAdmin"].includes(requestingUserRole)) {
      throw new UnauthorizedException(
        "Insufficient permissions",
        ErrorCodeEnum.ACCESS_UNAUTHORIZED
      );
    }

    const page = parseInt(filters.page || "1");
    const limit = parseInt(filters.limit || "10");

    const query: any = {};

    if (filters.role) {
      query.role = filters.role;
    }
    if (filters.search) {
      query.$or = [
        { fullName: { $regex: filters.search, $options: "i" } },
        { email: { $regex: filters.search, $options: "i" } },
      ];
    }

    // Use your mongoosePaginate plugin
    const paginateResult = await this.repo.paginateUsers(query, {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: { path: "createdBy", select: "fullName email role" },
      lean: true,
    });

    // const users = await this.repo.findAll();

    return {
      success: true,
      data: Array.isArray(paginateResult.data)
        ? paginateResult.data.map((user: any) => ({
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            phoneNumber: user.phoneNumber,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            createdBy: user.createdBy,
          }))
        : [],
      pagination: paginateResult.pagination,
      message: "Users retrieved successfully",
    };
  }

  async getUserById(
    userId: string,
    requestingUserRole: string
  ): Promise<{
    success: boolean;
    data: Partial<IUser>;
    message: string;
  }> {
    if (!["Admin", "SuperAdmin"].includes(requestingUserRole)) {
      throw new UnauthorizedException(
        "Insufficient permissions",
        ErrorCodeEnum.ACCESS_UNAUTHORIZED
      );
    }

    const user = await this.repo.findById(userId);

    if (!user) {
      throw new NotFoundException(
        "User not found",
        ErrorCodeEnum.AUTH_USER_NOT_FOUND
      );
    }

    return {
      success: true,
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        zoomMeetingLink: user.zoomMeetingLink,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        createdBy: user.createdBy,
      },
      message: "User retrieved successfully",
    };
  }

  // Admin/SuperAdmin update user
  async adminUpdateUser(
    userId: string,
    updateData: AdminUpdateUserInput["body"],
    requestingUserId: string,
    requestingUserRole: string
  ): Promise<{
    success: boolean;
    data: Partial<IUser>;
    message: string;
  }> {
    if (!["Admin", "SuperAdmin"].includes(requestingUserRole)) {
      throw new UnauthorizedException(
        "Insufficient permissions",
        ErrorCodeEnum.ACCESS_UNAUTHORIZED
      );
    }

    const targetUser = await this.repo.findById(userId);

    if (!targetUser) {
      throw new NotFoundException(
        "User not found",
        ErrorCodeEnum.AUTH_USER_NOT_FOUND
      );
    }

    // SuperAdmin cannot be edited by Admin
    if (targetUser.role === "SuperAdmin" && requestingUserRole === "Admin") {
      throw new UnauthorizedException(
        "Admin cannot edit SuperAdmin",
        ErrorCodeEnum.ACCESS_UNAUTHORIZED
      );
    }

    // Check if email is being changed and if it's already taken
    if (updateData.email && updateData.email !== targetUser.email) {
      const existingUser = await this.repo.findUserByEmail(updateData.email);
      if (existingUser) {
        throw new ConflictException(
          "Email already in use",
          ErrorCodeEnum.AUTH_EMAIL_ALREADY_EXISTS
        );
      }
    }

    const updatedUser = await this.repo.updateById(userId, updateData as any);
    console.log("=--------------------");
    console.log("Update suer", updatedUser);

    return {
      success: true,
      data: {
        _id: updatedUser!._id,
        fullName: updatedUser!.fullName,
        email: updatedUser!.email,
        role: updatedUser!.role,
        phoneNumber: updatedUser!.phoneNumber,
        updatedAt: updatedUser!.updatedAt,
      },
      message: "User updated successfully",
    };
  }

  // Delete user (Admin/SuperAdmin only)
  async deleteUser(
    userId: string,
    requestingUserId: string,
    requestingUserRole: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    if (!["Admin", "SuperAdmin"].includes(requestingUserRole)) {
      throw new UnauthorizedException(
        "Insufficient permissions",
        ErrorCodeEnum.ACCESS_UNAUTHORIZED
      );
    }

    const targetUser = await this.repo.findById(userId);

    if (!targetUser) {
      throw new NotFoundException(
        "User not found",
        ErrorCodeEnum.AUTH_USER_NOT_FOUND
      );
    }

    // Cannot delete yourself
    if (userId === requestingUserId) {
      throw new BadRequestException(
        "You cannot delete your own account",
        ErrorCodeEnum.VALIDATION_ERROR
      );
    }

    // Admin cannot delete SuperAdmin
    if (targetUser.role === "SuperAdmin" && requestingUserRole === "Admin") {
      throw new UnauthorizedException(
        "Admin cannot delete SuperAdmin",
        ErrorCodeEnum.ACCESS_UNAUTHORIZED
      );
    }

    await this.repo.deleteById(userId);

    return {
      success: true,
      message: "User deleted successfully",
    };
  }

  // Get own profile
  async getProfile(userId: string): Promise<{
    success: boolean;
    data: Partial<IUser>;
    message: string;
  }> {
    const user = await this.repo.findById(userId);

    if (!user) {
      throw new NotFoundException(
        "User not found",
        ErrorCodeEnum.AUTH_USER_NOT_FOUND
      );
    }

    return {
      success: true,
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        profileImage: user.profileImage,
        zoomMeetingLink: user.zoomMeetingLink,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
      message: "Profile retrieved successfully",
    };
  }

  // Update own profile (name, phone only)
  async updateProfile(
    userId: string,
    updateData: UpdateProfileInput["body"]
  ): Promise<{
    success: boolean;
    data: Partial<IUser>;
    message: string;
  }> {
    const updatedUser = await this.repo.updateById(userId, updateData as any);

    if (!updatedUser) {
      throw new NotFoundException(
        "User not found",
        ErrorCodeEnum.AUTH_USER_NOT_FOUND
      );
    }

    return {
      success: true,
      data: {
        _id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        zoomMeetingLink: updatedUser.zoomMeetingLink,
        updatedAt: updatedUser.updatedAt,
      },
      message: "Profile updated successfully",
    };
  }

  // Change own password
  async changePassword(
    userId: string,
    passwordData: ChangePasswordInput["body"]
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const { currentPassword, newPassword } = passwordData;

    const user = await this.repo.findUserByEmail(
      (await this.repo.findById(userId))!.email,
      true
    );

    if (!user) {
      throw new NotFoundException(
        "User not found",
        ErrorCodeEnum.AUTH_USER_NOT_FOUND
      );
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);

    if (!validPassword) {
      throw new BadRequestException(
        "Current password is incorrect",
        ErrorCodeEnum.AUTH_INVALID_CREDENTIALS
      );
    }

    // Hash new password
    const hashedPassword = await this.utility.hashPassword(newPassword);

    await this.repo.updateById(userId, {
      password: hashedPassword,
    } as any);

    return {
      success: true,
      message: "Password changed successfully",
    };
  }

  async updateProfileImage(
    userId: string,
    imageUrl: string
  ): Promise<{ success: boolean; imageUrl: string; message: string }> {
    const updatedUser = await this.repo.updateById(userId, {
      profileImage: imageUrl,
    });
    if (!updatedUser)
      throw new NotFoundException(
        "User not found",
        ErrorCodeEnum.AUTH_USER_NOT_FOUND
      );
    return {
      success: true,
      imageUrl,
      message: "Profile image updated!",
    };
  }

  async updateFCMToken(userId: string, fcmToken: string): Promise<void> {
    await this.repo.updateById(userId, { fcmToken });
  }
}
