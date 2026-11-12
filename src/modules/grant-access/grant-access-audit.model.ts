// file: src/modules/grant-access/grant-access-audit.model.ts

import type { Document } from "mongoose";

import { model, Schema } from "mongoose";

/**
 * Audit document for renter and owner match removal.
 *
 * Written by `unmatchRequestForRegisteredAgent` in `pre-market.service.ts`
 * BEFORE the grant's status is flipped to "rejected". Captures who
 * triggered the unmatch, what was the previous status, and any
 * user-supplied personal message — so we have a forensic trail even
 * though unmatch is a soft-update (the grant record stays in
 * `grantaccessrequests`).
 */
export type IGrantAccessUnmatchAudit = {
  grantId?: string;
  matchType?: "grant_access" | "owner_representation";
  ownerMatchSnapshot?: Record<string, unknown>;
  agentId: string;
  preMarketRequestId: string;
  /**
   * The registered agent who initiated the unmatch (matches
   * `request.registeredAgentId` at the moment of unmatch).
   */
  unmatchedByAgentId: string;
  timestamp: Date;
  /**
   * Previous grant status, or owner_matched for an owner-side snapshot.
   */
  previousStatus:
    | "pending"
    | "approved"
    | "free"
    | "rejected"
    | "paid"
    | "owner_matched";
  sendEmailNotice: boolean;
  personalMessage?: string | null;
} & Document<unknown, any, any, Record<string, any>, object>;

const GrantAccessUnmatchAuditSchema = new Schema<IGrantAccessUnmatchAudit>({
  grantId: { type: String, index: true },
  matchType: { type: String, enum: ["grant_access", "owner_representation"], default: "grant_access" },
  ownerMatchSnapshot: { type: Schema.Types.Mixed },
  agentId: { type: String, required: true, index: true },
  preMarketRequestId: { type: String, required: true, index: true },
  unmatchedByAgentId: { type: String, required: true },
  timestamp: {
    type: Date,
    required: true,
    default: () => new Date(),
    index: true,
  },
  previousStatus: {
    type: String,
    required: true,
    enum: ["pending", "approved", "free", "rejected", "paid", "owner_matched"],
  },
  sendEmailNotice: { type: Boolean, required: true },
  personalMessage: { type: String, default: null },
});

export const GrantAccessUnmatchAuditModel = model<IGrantAccessUnmatchAudit>(
  "GrantAccessUnmatchAudit",
  GrantAccessUnmatchAuditSchema,
  "grantaccess_unmatch_audit",
);
