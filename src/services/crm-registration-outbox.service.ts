import type { ClientSession } from "mongoose";

import { model, Schema, Types } from "mongoose";

export type CrmOutboxState = "waiting_verification" | "ready" | "pending" | "accepted" | "failed" | "uncertain" | "suppressed" | "skipped" | "review";

export type CrmOutboxRecord = {
  _id: string;
  renterUserId: Types.ObjectId;
  agentUserId: Types.ObjectId;
  state: CrmOutboxState;
  createdAt: Date;
  verifiedAt?: Date;
  updatedAt: Date;
  recipient?: string;
  messageId?: string;
  attemptStartedAt?: Date;
  attemptCount: number;
  errorCategory?: "provider_rejected" | "delivery_unknown" | "sandbox_suppressed" | "invalid_registration_data";
};

const schema = new Schema<CrmOutboxRecord>({
  _id: { type: String, required: true },
  renterUserId: { type: Schema.Types.ObjectId, required: true },
  agentUserId: { type: Schema.Types.ObjectId, required: true },
  state: { type: String, required: true, enum: ["waiting_verification", "ready", "pending", "accepted", "failed", "uncertain", "suppressed", "skipped", "review"] },
  createdAt: { type: Date, required: true },
  verifiedAt: { type: Date },
  updatedAt: { type: Date, required: true },
  recipient: { type: String, select: false },
  messageId: { type: String },
  attemptStartedAt: { type: Date },
  attemptCount: { type: Number, default: 0 },
  errorCategory: { type: String, enum: ["provider_rejected", "delivery_unknown", "sandbox_suppressed", "invalid_registration_data"] },
}, { versionKey: false });
schema.index({ state: 1, createdAt: 1 });

export const CrmRegistrationOutbox = model<CrmOutboxRecord>("CrmRegistrationOutbox", schema);

/** Built-in MongoDB _id uniqueness makes one event per renter and event type. */
export function crmRegistrationEventId(renterUserId: string): string {
  if (!Types.ObjectId.isValid(renterUserId))
    throw new Error("Invalid renter identifier");
  return `renter-registration:${new Types.ObjectId(renterUserId).toHexString()}`;
}

export class CrmRegistrationOutboxRepository {
  async createWaiting(renterUserId: Types.ObjectId, agentUserId: Types.ObjectId, session: ClientSession): Promise<void> {
    const now = new Date();
    await CrmRegistrationOutbox.create([{ _id: crmRegistrationEventId(renterUserId.toString()), renterUserId, agentUserId, state: "waiting_verification", createdAt: now, updatedAt: now, attemptCount: 0 }], { session });
  }

  /** Snapshot once; a skipped event cannot later become ready. */
  async resolveEligibility(renterUserId: string, recipient: string | null, session: ClientSession): Promise<boolean> {
    const now = new Date();
    const result = await CrmRegistrationOutbox.updateOne(
      { _id: crmRegistrationEventId(renterUserId), state: "waiting_verification" },
      { $set: { state: recipient ? "ready" : "skipped", updatedAt: now, verifiedAt: now, ...(recipient ? { recipient } : {}) } },
      { session },
    );
    return result.modifiedCount === 1;
  }

  async findReady(renterUserId: string): Promise<CrmOutboxRecord | null> {
    return CrmRegistrationOutbox.findOne({ _id: crmRegistrationEventId(renterUserId), state: "ready", attemptCount: 0 }).select("+recipient").lean();
  }

  async markInvalidData(renterUserId: string): Promise<boolean> {
    const result = await CrmRegistrationOutbox.updateOne(
      { _id: crmRegistrationEventId(renterUserId), state: "ready", attemptCount: 0 },
      { $set: { state: "review", errorCategory: "invalid_registration_data", updatedAt: new Date() } },
      { writeConcern: { w: "majority" } },
    );
    return result.modifiedCount === 1;
  }

  /** Only a never-claimed ready event can be dispatched. */
  async claim(renterUserId: string, expectedRecipient?: string): Promise<CrmOutboxRecord | null> {
    const now = new Date();
    return CrmRegistrationOutbox.findOneAndUpdate(
      { _id: crmRegistrationEventId(renterUserId), state: "ready", attemptCount: 0, ...(expectedRecipient ? { recipient: expectedRecipient } : {}) },
      { $set: { state: "pending", updatedAt: now, attemptStartedAt: now }, $inc: { attemptCount: 1 } },
      { new: true, writeConcern: { w: "majority" } },
    ).select("+recipient").lean();
  }

  async recordOutcome(renterUserId: string, state: "accepted" | "failed" | "uncertain" | "suppressed", messageId?: string): Promise<boolean> {
    if (state === "accepted" && !messageId)
      throw new Error("Provider message ID is required for acceptance");
    const errorCategory = state === "failed" ? "provider_rejected" : state === "uncertain" ? "delivery_unknown" : state === "suppressed" ? "sandbox_suppressed" : undefined;
    const result = await CrmRegistrationOutbox.updateOne(
      { _id: crmRegistrationEventId(renterUserId), state: "pending", attemptCount: 1 },
      { $set: { state, updatedAt: new Date(), ...(errorCategory ? { errorCategory } : {}), ...(state === "accepted" && messageId ? { messageId } : {}) } },
      { writeConcern: { w: "majority" } },
    );
    return result.modifiedCount === 1;
  }
}
