import { ErrorCodeEnum } from "@/enums/error-code.enum";
import { logger } from "@/middlewares/pino-logger";
import { ActivityLogService } from "@/modules/activity-log/activity-log.service";
import { NotificationService } from "@/modules/notification/notification.service";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@/utils/app-error.utils";
import type { IBlockedEmail } from "./blocked-email.model";
import { BlockedEmailRepository } from "./blocked-email.repository";
import type {
  BlockedEmailStatus,
  CreateBlockedEmailPayload,
} from "./blocked-email.type";
import { UserRepository } from "../user/user.repository";

type PopulatedUser =
  | {
      fullName?: string;
      email?: string;
    }
  | string
  | null
  | undefined;

export class BlockedEmailService {
  private readonly repository = new BlockedEmailRepository();
  private readonly notificationService = new NotificationService();
  private readonly activityLogService = new ActivityLogService();
  private readonly userRepository = new UserRepository();

  async assertEmailNotBlocked(
    email?: string | null,
    context?: {
      action?: "login" | "register" | "submit_request";
      ipAddress?: string | null;
    },
  ): Promise<void> {
    const value = email?.trim();
    if (!value) return;

    const blocked = await this.repository.findActiveByEmail(value);
    if (!blocked) return;

    if (context?.action) {
      await this.logBlockedAttempt(value, blocked.reason, {
        action: context.action,
        ipAddress: context.ipAddress,
      });
    }

    throw new ForbiddenException(
      "This email is not permitted to access the BeforeListed\u2122 platform.\nIf you believe this is an error, please contact support@beforelisted.com.",
      ErrorCodeEnum.EMAIL_BLOCKED,
    );
  }

  async list(status?: BlockedEmailStatus) {
    const blockedEmails = await this.repository.list(status);
    return blockedEmails.map((blockedEmail) => this.toResponse(blockedEmail));
  }

  async getActiveEmailSet(emails: string[]): Promise<Set<string>> {
    const blockedEmails = await this.repository.findActiveByEmails(emails);
    return new Set(blockedEmails);
  }

  async block(
    payload: CreateBlockedEmailPayload,
    adminId: string,
    ipAddress?: string | null,
  ) {
    if (!payload.email?.trim()) {
      throw new BadRequestException("Email address is required");
    }

    const blockedEmail = await this.repository.blockEmail(
      payload.email,
      payload.reason,
      adminId,
    );

    const admin = await this.userRepository.findById(adminId);
    const adminName = admin?.fullName?.trim() || "Unknown admin";

    await Promise.allSettled([
      this.notificationService.notifyAdminsEmailBlocked({
        email: blockedEmail.email,
        adminName,
        reason: blockedEmail.reason,
      }),
      this.activityLogService.create({
        email: blockedEmail.email,
        actionType: "Email added to blocklist",
        reason: blockedEmail.reason,
        ipAddress,
      }),
    ]);

    return this.toResponse(blockedEmail);
  }

  async unblock(id: string, adminId: string, ipAddress?: string | null) {
    const existing = await this.repository.unblockEmail(id, adminId);

    if (!existing) {
      throw new NotFoundException("Blocked email not found");
    }

    await this.activityLogService.create({
      email: existing.email,
      actionType: "Email unblocked",
      reason: existing.reason,
      ipAddress,
    });

    return this.toResponse(existing);
  }

  private async logBlockedAttempt(
    email: string,
    reason: string,
    context: {
      action: "login" | "register" | "submit_request";
      ipAddress?: string | null;
    },
  ): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const notificationActionLabel =
      context.action === "login"
        ? "Login"
        : context.action === "register"
          ? "Register"
          : "Submit Request";
    const logActionType =
      context.action === "login"
        ? "Blocked login attempt"
        : context.action === "register"
          ? "Blocked registration attempt"
          : "Blocked request submission";

    const results = await Promise.allSettled([
      this.notificationService.notifyAdminsBlockedAccessAttempt({
        email: normalizedEmail,
        action: notificationActionLabel,
        reason,
      }),
      this.activityLogService.create({
        email: normalizedEmail,
        actionType: logActionType,
        reason,
        ipAddress: context.ipAddress,
      }),
    ]);

    results.forEach((result) => {
      if (result.status === "rejected") {
        logger.error(
          {
            email: normalizedEmail,
            action: context.action,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason),
          },
          "Failed to record blocked email attempt side effects",
        );
      }
    });
  }

  private formatUser(user: PopulatedUser) {
    if (!user || typeof user === "string") {
      return {
        fullName: null,
        email: null,
      };
    }

    return {
      fullName: user.fullName ?? null,
      email: user.email ?? null,
    };
  }

  private toResponse(blockedEmail: IBlockedEmail) {
    return {
      _id: blockedEmail._id?.toString(),
      email: blockedEmail.email,
      reason: blockedEmail.reason,
      status: blockedEmail.status,
      blockedAt: blockedEmail.blockedAt,
      blockedBy: this.formatUser(blockedEmail.blockedBy as PopulatedUser),
      removedAt: blockedEmail.removedAt ?? null,
      removedBy: this.formatUser(blockedEmail.removedBy as PopulatedUser),
      createdAt: blockedEmail.createdAt,
      updatedAt: blockedEmail.updatedAt,
    };
  }
}
