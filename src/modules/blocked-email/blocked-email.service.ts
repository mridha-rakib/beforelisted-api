import { ErrorCodeEnum } from "@/enums/error-code.enum";
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

  async assertEmailNotBlocked(email?: string | null): Promise<void> {
    const value = email?.trim();
    if (!value) return;

    const blocked = await this.repository.findActiveByEmail(value);
    if (!blocked) return;

    throw new ForbiddenException(
      "This email address has been blocked. Please contact support if you believe this is a mistake.",
      ErrorCodeEnum.EMAIL_BLOCKED,
    );
  }

  async list(status?: BlockedEmailStatus) {
    const blockedEmails = await this.repository.list(status);
    return blockedEmails.map((blockedEmail) => this.toResponse(blockedEmail));
  }

  async block(payload: CreateBlockedEmailPayload, adminId: string) {
    if (!payload.email?.trim()) {
      throw new BadRequestException("Email address is required");
    }

    const blockedEmail = await this.repository.blockEmail(
      payload.email,
      payload.reason,
      adminId,
    );

    return this.toResponse(blockedEmail);
  }

  async unblock(id: string, adminId: string) {
    const existing = await this.repository.unblockEmail(id, adminId);

    if (!existing) {
      throw new NotFoundException("Blocked email not found");
    }

    return this.toResponse(existing);
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
