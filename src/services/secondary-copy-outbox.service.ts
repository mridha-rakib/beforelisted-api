import { model, Schema, Types } from "mongoose";
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { z } from "zod";

import type { IEmailOptions, IEmailTransporter } from "@/services/email.types";

type State = "waiting_primary" | "ready" | "pending" | "accepted" | "failed" | "uncertain" | "suppressed" | "review";
type RecordData = {
  _id: string;
  agentUserId: Types.ObjectId;
  templateType: string;
  state: State;
  payload?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  attemptStartedAt?: Date;
  attemptCount: number;
  messageId?: string;
  keyVersion?: string;
};

const schema = new Schema<RecordData>({
  _id: { type: String, required: true },
  agentUserId: { type: Schema.Types.ObjectId, required: true },
  templateType: { type: String, required: true },
  state: { type: String, required: true, enum: ["waiting_primary", "ready", "pending", "accepted", "failed", "uncertain", "suppressed", "review"] },
  payload: { type: String, select: false },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
  attemptStartedAt: Date,
  attemptCount: { type: Number, required: true },
  messageId: String,
  keyVersion: String,
}, { versionKey: false });
schema.index({ state: 1, createdAt: 1 });

export const SecondaryCopyOutbox = model<RecordData>("SecondaryCopyOutbox", schema);

/** A separate key must be provisioned through the deployment secret manager. */
export class SecondaryCopyOutboxService {
  constructor(private readonly key: Buffer, private readonly transporter: IEmailTransporter, private readonly keyVersion = "legacy", private readonly identityKey = key, private readonly keyring: Record<string, Buffer> = { legacy: key }) {
    if (key.length !== 32)
      throw new Error("Secondary copy encryption key must be 32 bytes");
    if (identityKey.length !== 32)
      throw new Error("Secondary copy identity key must be 32 bytes");
  }

  private encrypt(value: IEmailOptions): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const json = JSON.stringify(value, (_key, item) => Buffer.isBuffer(item) ? { type: "Buffer", data: [...item] } : item);
    const encrypted = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
  }

  private decrypt(value: string, version: string): IEmailOptions {
    const data = Buffer.from(value, "base64");
    const key = this.keyring[version];
    if (!key || key.length !== 32)
      throw new Error("Secondary copy key unavailable");
    const cipher = createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
    cipher.setAuthTag(data.subarray(12, 28));
    return JSON.parse(Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString("utf8"), (_key, item) => {
      if (item && item.type === "Buffer" && Array.isArray(item.data))
        return Buffer.from(item.data);
      return item;
    });
  }

  /** eventId identifies one primary dispatch and is reused for all its agent targets. */
  async prepare(eventId: string, agentUserId: string, templateType: string, recipient: string, options: IEmailOptions, expiresAt: Date): Promise<string> {
    const address = recipient.trim().toLowerCase();
    if (!eventId || !templateType || !z.email().safeParse(address).success || !Types.ObjectId.isValid(agentUserId) || !Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date())
      throw new Error("Invalid secondary copy intent");
    const id = createHmac("sha256", this.identityKey).update(JSON.stringify([eventId, new Types.ObjectId(agentUserId).toHexString(), templateType])).digest("hex");
    const now = new Date();
    const payload = this.encrypt({ ...options, to: address, cc: undefined, bcc: undefined, deliveryPolicy: "secondary-copy-single-attempt" });
    await SecondaryCopyOutbox.updateOne({ _id: id }, { $setOnInsert: { agentUserId: new Types.ObjectId(agentUserId), templateType, state: "waiting_primary", payload, expiresAt, keyVersion: this.keyVersion, createdAt: now, updatedAt: now, attemptCount: 0 } }, { upsert: true, writeConcern: { w: "majority" } });
    return id;
  }

  async markPrimaryAccepted(id: string): Promise<void> {
    await SecondaryCopyOutbox.updateOne({ _id: id, state: "waiting_primary" }, { $set: { state: "ready", updatedAt: new Date() } }, { writeConcern: { w: "majority" } });
  }

  async markPrimaryUnconfirmed(id: string): Promise<void> {
    await SecondaryCopyOutbox.updateOne({ _id: id, state: "waiting_primary" }, { $set: { state: "review", updatedAt: new Date() } }, { writeConcern: { w: "majority" } });
  }

  async dispatch(id: string): Promise<void> {
    const candidate = await SecondaryCopyOutbox.findOne({ _id: id, state: "ready", attemptCount: 0 }).select("+payload").lean();
    if (!candidate)
      return;
    let options: IEmailOptions;
    try {
      if (candidate.expiresAt <= new Date() || !candidate.payload)
        throw new Error("Expired payload");
      options = this.decrypt(candidate.payload, candidate.keyVersion || "legacy");
    }
    catch {
      await SecondaryCopyOutbox.updateOne({ _id: id, state: "ready", attemptCount: 0 }, { $set: { state: "review", updatedAt: new Date() } }, { writeConcern: { w: "majority" } });
      return;
    }
    const now = new Date();
    const claim = await SecondaryCopyOutbox.findOneAndUpdate({ _id: id, state: "ready", attemptCount: 0 }, { $set: { state: "pending", updatedAt: now, attemptStartedAt: now }, $inc: { attemptCount: 1 } }, { new: true, writeConcern: { w: "majority" } }).lean();
    if (!claim)
      return;
    let state: "accepted" | "failed" | "uncertain" | "suppressed" = "uncertain";
    let messageId: string | undefined;
    try {
      const response = await this.transporter.send(options);
      if (response.deliveryOutcome === "accepted" && response.messageId) {
        state = "accepted";
        messageId = response.messageId;
      }
      else if (response.deliveryOutcome === "failed" || response.deliveryOutcome === "suppressed") {
        state = response.deliveryOutcome;
      }
    }
    catch { /* A provider exception can mean acceptance was uncertain. */ }
    await SecondaryCopyOutbox.updateOne({ _id: id, state: "pending", attemptCount: 1 }, { $set: { state, updatedAt: new Date(), ...(messageId ? { messageId } : {}) } }, { writeConcern: { w: "majority" } });
  }

  /** Call from a supervised scheduler. Claimed records are deliberately excluded. */
  async recoverReady(limit = 50): Promise<void> {
    const records = await SecondaryCopyOutbox.find({ state: "ready", attemptCount: 0 }).sort({ createdAt: 1 }).limit(limit).select("_id").lean();
    for (const record of records)
      await this.dispatch(record._id);
  }

  /** Erase encrypted bodies after retention while keeping reconciliation metadata. */
  async eraseExpiredPayloads(): Promise<void> {
    await SecondaryCopyOutbox.updateMany({ expiresAt: { $lte: new Date() }, payload: { $exists: true }, state: { $in: ["ready", "waiting_primary"] } }, { $set: { state: "review", updatedAt: new Date() }, $unset: { payload: "" } }, { writeConcern: { w: "majority" } });
    await SecondaryCopyOutbox.updateMany({ expiresAt: { $lte: new Date() }, payload: { $exists: true } }, { $unset: { payload: "" } }, { writeConcern: { w: "majority" } });
  }
}

/** Parse only when copies are needed or the recovery worker starts. */
export function configuredSecondaryCopyOutbox(transporter: IEmailTransporter): { outbox: SecondaryCopyOutboxService; retentionMs: number } {
  try {
    const active = process.env.SECONDARY_COPY_ACTIVE_KEY_VERSION || "";
    const raw = JSON.parse(process.env.SECONDARY_COPY_KEYS || "{}");
    const identity = process.env.SECONDARY_COPY_IDENTITY_KEY || "";
    const hours = Number(process.env.SECONDARY_COPY_RETENTION_HOURS);
    if (!active || !raw || typeof raw !== "object" || Array.isArray(raw) || !/^[\w-]+$/.test(active) || !Number.isFinite(hours) || hours <= 0 || hours > 24 * 365)
      throw new Error("Invalid configuration");
    const decode = (value: unknown): Buffer => {
      if (typeof value !== "string" || !/^[A-Z0-9+/]{43}=$/i.test(value))
        throw new Error("Invalid key");
      const key = Buffer.from(value, "base64");
      if (key.length !== 32)
        throw new Error("Invalid key");
      return key;
    };
    const keyring = Object.fromEntries(Object.entries(raw).map(([version, value]) => [version, decode(value)]));
    if (!keyring[active])
      throw new Error("Active key missing");
    return { outbox: new SecondaryCopyOutboxService(keyring[active], transporter, active, decode(identity), keyring), retentionMs: hours * 3600000 };
  }
  catch {
    throw new Error("Secondary copy outbox configuration is invalid");
  }
}
