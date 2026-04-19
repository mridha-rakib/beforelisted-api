import { Types } from "mongoose";
import { BlockedEmail, type IBlockedEmail } from "./blocked-email.model";
import type {
  BlockedEmailReason,
  BlockedEmailStatus,
} from "./blocked-email.type";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export class BlockedEmailRepository {
  async findByEmail(email: string): Promise<IBlockedEmail | null> {
    return BlockedEmail.findOne({ email: normalizeEmail(email) }).exec();
  }

  async findActiveByEmail(email: string): Promise<IBlockedEmail | null> {
    return BlockedEmail.findOne({
      email: normalizeEmail(email),
      status: "active",
    }).exec();
  }

  async list(status?: BlockedEmailStatus): Promise<IBlockedEmail[]> {
    return BlockedEmail.find(status ? { status } : {})
      .sort({ blockedAt: -1, createdAt: -1 })
      .populate("blockedBy", "fullName email")
      .populate("removedBy", "fullName email")
      .exec();
  }

  async blockEmail(
    email: string,
    reason: BlockedEmailReason,
    blockedBy: string,
  ): Promise<IBlockedEmail> {
    const normalizedEmail = normalizeEmail(email);
    const now = new Date();

    const blocked = await BlockedEmail.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $set: {
          email: normalizedEmail,
          reason,
          status: "active",
          blockedAt: now,
          blockedBy: new Types.ObjectId(blockedBy),
          removedAt: null,
          removedBy: null,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    )
      .populate("blockedBy", "fullName email")
      .populate("removedBy", "fullName email")
      .exec();

    return blocked as IBlockedEmail;
  }

  async unblockEmail(id: string, removedBy: string): Promise<IBlockedEmail | null> {
    return BlockedEmail.findByIdAndUpdate(
      id,
      {
        $set: {
          status: "removed",
          removedAt: new Date(),
          removedBy: new Types.ObjectId(removedBy),
        },
      },
      { new: true },
    )
      .populate("blockedBy", "fullName email")
      .populate("removedBy", "fullName email")
      .exec();
  }
}

export const normalizeBlockedEmail = normalizeEmail;
