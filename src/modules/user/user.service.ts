// file: src/modules/user/user.service.ts

import { MESSAGES } from "@/constants/app.constants";
import { env } from "@/env";
import { logger } from "@/middlewares/pino-logger";
import { AuthUtil } from "@/modules/auth/auth.utils";
import { emailService } from "@/services/email.service";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "@/utils/app-error.utils";
import bcryptjs from "bcryptjs";
import type { IUser } from "./user.interface";
import { UserRepository } from "./user.repository";
import type {
  AdminUpdateUserPayload,
  ChangePasswordPayload,
  UpdateUserPayload,
  UserResponse,
  UserWithStats,
} from "./user.type";

/**
 * User Service
 * Handles all user business logic
 * Does NOT extend BaseService - needs custom logic
 */
export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<IUser | null> {
    return this.userRepository.findById(userId);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<IUser | null> {
    return this.userRepository.findByEmail(email);
  }

  /**
   * Get user by email with password (for login)
   */
  async getUserByEmailWithPassword(email: string): Promise<IUser | null> {
    return this.userRepository.findByEmailWithPassword(email);
  }

  /**
   * Get user by verification token
   */
  async getUserByVerificationToken(token: string): Promise<IUser | null> {
    return this.userRepository.findByVerificationToken(token);
  }

  /**
   * Get user profile (with stats)
   */
  async getUserProfile(userId: string): Promise<UserWithStats> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    const response = this.toUserResponse(user);
    const stats = await this.getUserStats(user.role, userId);

    return {
      ...response,
      stats,
    };
  }

  /**
   * Update user profile (only self)
   */
  async updateUserProfile(
    userId: string,
    payload: UpdateUserPayload
  ): Promise<UserWithStats> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    // Update fields
    const updated = await this.userRepository.updateById(userId, payload);
    if (!updated) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    logger.info({ userId }, "User profile updated");
    const response = this.toUserResponse(updated);
    const stats = await this.getUserStats(updated.role, userId);

    return {
      ...response,
      stats,
    };
  }

  /**
   * Change email (send verification)
   */
  async requestEmailChange(
    userId: string,
    newEmail: string
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    // Check if new email already exists
    const existingUser = await this.userRepository.findByEmail(newEmail);
    if (existingUser && existingUser._id.toString() !== userId) {
      throw new ConflictException(MESSAGES.AUTH.EMAIL_ALREADY_EXISTS);
    }

    // Generate verification token
    const verificationToken = AuthUtil.generateEmailVerificationToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Store token temporarily (in real app, use Redis or separate collection)
    // For now, we'll store in emailVerificationToken field
    await this.userRepository.updateVerificationToken(userId, {
      emailVerificationToken: verificationToken,
      emailVerificationExpiresAt: expiresAt,
    });

    // Send verification email
    const verificationLink = AuthUtil.generateVerificationLink(
      env.CLIENT_URL,
      verificationToken
    );

    await emailService.sendEmailVerification(
      newEmail,
      user.fullName,
      verificationLink
    );

    logger.info({ userId, newEmail }, "Email change requested");

    return {
      message: "Verification email sent to new email address",
    };
  }

  /**
   * Verify new email
   */
  async verifyNewEmail(
    userId: string,
    newEmail: string,
    verificationToken: string
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    // Verify token matches
    if (user.emailVerificationToken !== verificationToken) {
      throw new BadRequestException("Invalid verification token");
    }

    // Check token expiration
    if (
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt < new Date()
    ) {
      throw new BadRequestException("Verification token expired");
    }

    // Update email
    const updated = await this.userRepository.updateById(userId, {
      email: newEmail.toLowerCase(),
      emailVerificationToken: undefined,
      emailVerificationExpiresAt: undefined,
    });

    logger.info({ userId, newEmail }, "Email changed successfully");

    return {
      message: "Email changed successfully",
    };
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    payload: ChangePasswordPayload
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findByEmailWithPassword(
      (await this.userRepository.findById(userId))?.email || ""
    );

    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    // Verify current password
    const isPasswordValid = await bcryptjs.compare(
      payload.currentPassword,
      user.password
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    // Hash new password
    const hashedPassword = await bcryptjs.hash(
      payload.newPassword,
      env.SALT_ROUNDS
    );

    // Update password
    await this.userRepository.updatePassword(userId, hashedPassword);

    logger.info({ userId }, "Password changed");

    return {
      message: "Password changed successfully",
    };
  }

  /**
   * Update verification token
   */
  async updateVerificationToken(
    userId: string,
    data: { emailVerificationToken?: string; emailVerificationExpiresAt?: Date }
  ): Promise<IUser | null> {
    return this.userRepository.updateVerificationToken(userId, data);
  }

  /**
   * Update password
   */
  async updatePassword(
    userId: string,
    hashedPassword: string
  ): Promise<IUser | null> {
    return this.userRepository.updatePassword(userId, hashedPassword);
  }

  /**
   * Mark email as verified
   */
  async markEmailAsVerified(userId: string): Promise<IUser | null> {
    const result = await this.userRepository.markEmailAsVerified(userId);
    if (result) {
      logger.info({ userId }, "Email verified");
    }
    return result;
  }

  /**
   * Update last login
   */
  async updateLastLogin(userId: string): Promise<IUser | null> {
    return this.userRepository.updateLastLogin(userId);
  }

  /**
   * Soft delete user (self-delete)
   */
  async deleteUserAccount(userId: string): Promise<{ message: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    await this.userRepository.softDeleteUser(userId, userId);
    logger.info({ userId }, "User account deleted");

    return {
      message: "Account deleted successfully",
    };
  }

  /**
   * ADMIN: Get user by ID (with stats)
   */
  async adminGetUser(userId: string): Promise<UserWithStats> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    const response = this.toUserResponse(user);
    const stats = await this.getUserStats(user.role, userId);

    return {
      ...response,
      stats,
    };
  }

  /**
   * ADMIN: List all users with pagination and filters
   */
  async adminListUsers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    role?: string,
    accountStatus?: string,
    sort: string = "-createdAt"
  ): Promise<{
    data: UserWithStats[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  }> {
    const filter: any = { isDeleted: false };

    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [{ email: searchRegex }, { fullName: searchRegex }];
    }

    if (role) {
      filter.role = role;
    }

    if (accountStatus) {
      filter.accountStatus = accountStatus;
    }

    // Parse sort string
    const sortObj: any = {};
    if (sort) {
      const fields = sort.split(",");
      fields.forEach((field: string) => {
        if (field.startsWith("-")) {
          sortObj[field.substring(1)] = -1;
        } else {
          sortObj[field] = 1;
        }
      });
    }

    const result = await this.userRepository.paginate(filter, {
      page,
      limit,
      sort: sortObj,
    });

    // Add stats to each user
    const dataWithStats = await Promise.all(
      result.data.map(async (user) => {
        const response = this.toUserResponse(user);
        const stats = await this.getUserStats(user.role, user._id.toString());
        return { ...response, stats };
      })
    );

    return {
      data: dataWithStats,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.pageCount,
        totalItems: result.totalItems,
        itemsPerPage: result.itemsPerPage,
      },
    };
  }

  /**
   * ADMIN: Update user
   */
  async adminUpdateUser(
    userId: string,
    payload: AdminUpdateUserPayload
  ): Promise<UserWithStats> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    // Check if new email already exists
    if (payload.email && payload.email !== user.email) {
      const existingUser = await this.userRepository.findByEmail(payload.email);
      if (existingUser && existingUser._id.toString() !== userId) {
        throw new ConflictException(MESSAGES.AUTH.EMAIL_ALREADY_EXISTS);
      }
    }

    const updated = await this.userRepository.updateById(userId, payload);
    if (!updated) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    logger.info({ userId, changes: payload }, "User updated by admin");
    const response = this.toUserResponse(updated);
    const stats = await this.getUserStats(updated.role, userId);

    return {
      ...response,
      stats,
    };
  }

  /**
   * ADMIN: Soft delete user
   */
  async adminDeleteUser(
    userId: string,
    deletedBy: string
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    await this.userRepository.softDeleteUser(userId, deletedBy);
    logger.info({ userId, deletedBy }, "User deleted by admin");

    return {
      message: MESSAGES.USER.USER_DELETED,
    };
  }

  /**
   * ADMIN: Restore soft-deleted user
   */
  async adminRestoreUser(userId: string): Promise<UserWithStats> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.isDeleted) {
      throw new NotFoundException("User not found or already active");
    }

    const restored = await this.userRepository.restoreUser(userId);
    if (!restored) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    logger.info({ userId }, "User restored by admin");
    const response = this.toUserResponse(restored);
    const stats = await this.getUserStats(restored.role, userId);

    return {
      ...response,
      stats,
    };
  }

  /**
   * ADMIN: Permanently delete user (hard delete)
   */
  async adminPermanentlyDeleteUser(
    userId: string
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(MESSAGES.USER.USER_NOT_FOUND);
    }

    await this.userRepository.permanentlyDeleteUser(userId);
    logger.info({ userId }, "User permanently deleted");

    return {
      message: "User permanently deleted",
    };
  }

  /**
   * Convert user to response (exclude sensitive fields)
   */
  toUserResponse(user: IUser): UserResponse {
    const userObj = user.toObject ? user.toObject() : user;
    const { password, emailVerificationToken, ...rest } = userObj as any;
    return rest as UserResponse;
  }

  /**
   * Get user statistics based on role
   * This would fetch from agent/renter profiles
   * For now, returning placeholder structure
   */
  private async getUserStats(role: string, userId: string): Promise<any> {
    // This will be populated when Agent and Renter services are created
    // For now, return structure
    if (role === "agent") {
      return {
        agentStats: {
          totalRequests: 0,
          grantAccessStatus: "pending",
          verificationStatus: "pending",
          isSuspended: false,
        },
      };
    }

    if (role === "renter") {
      return {
        renterStats: {
          activeRequests: 0,
          totalSavedRequests: 0,
          totalRequests: 0,
        },
      };
    }

    return null;
  }

  /**
   * Create user (used by auth service)
   */
  async create(data: any): Promise<IUser> {
    return this.userRepository.create(data);
  }

  /**
   * Check if user exists by email
   */
  async userExists(email: string): Promise<boolean> {
    const user = await this.userRepository.findByEmail(email);
    return user !== null;
  }

  /**
   * Count users by role
   */
  async countByRole(role: string): Promise<number> {
    return this.userRepository.countByRole(role);
  }

  /**
   * Count active users
   */
  async countActiveUsers(): Promise<number> {
    return this.userRepository.countActiveUsers();
  }
}
