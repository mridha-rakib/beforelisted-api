import { z } from "zod";

import { ROLES } from "@/constants/app.constants";
import { AgentProfile } from "@/modules/agent/agent.model";
import { RenterUtil } from "@/modules/renter/renter.utils";
import { User } from "@/modules/user/user.model";

import type { IEmailOptions, IEmailRecipient } from "./email.types.js";

function emails(value?: IEmailRecipient | IEmailRecipient[]): string[] {
  return (value ? (Array.isArray(value) ? value : [value]) : [])
    .map(item => (typeof item === "string" ? item : item.email).trim().toLowerCase())
    .filter(Boolean);
}

export function eligibleDetachedSecondary(_options: IEmailOptions, candidate?: string): string | undefined {
  const address = candidate?.trim().toLowerCase();
  return address && z.email().safeParse(address).success ? address : undefined;
}

export async function findSecondarySystemRecipients(options: IEmailOptions): Promise<string[]> {
  const recipients = [...new Set([...emails(options.to), ...emails(options.cc)])];
  if (!recipients.length)
    return [];
  const users = await User.find({ email: { $in: recipients }, role: ROLES.AGENT, isDeleted: false }).select("_id").lean();
  if (!users.length)
    return [];
  const profiles = await AgentProfile.find({ userId: { $in: users.map(user => user._id) }, secondaryEmailIsCrm: { $ne: true } }).select("secondaryEmail").lean();
  const alreadyIncluded = new Set([...recipients, ...emails(options.bcc)]);
  const copies = new Set<string>();
  for (const profile of profiles) {
    const email = profile.secondaryEmail?.trim().toLowerCase();
    if (email && z.email().safeParse(email).success && !alreadyIncluded.has(email))
      copies.add(email);
  }
  return [...copies];
}

/** Preserve each agent's identity, including when multiple agents share an address. */
export async function findSecondarySystemTargets(options: IEmailOptions): Promise<{ agentUserId: string; recipient: string }[]> {
  const recipients = [...new Set([...emails(options.to), ...emails(options.cc), ...emails(options.bcc)])];
  if (!recipients.length)
    return [];
  const users = await User.find({ email: { $in: recipients }, role: ROLES.AGENT, isDeleted: false }).select("_id").lean();
  if (!users.length)
    return [];
  const profiles = await AgentProfile.find({ userId: { $in: users.map(user => user._id) }, secondaryEmailIsCrm: { $ne: true } }).select("userId secondaryEmail").lean();
  return profiles.flatMap((profile) => {
    const recipient = profile.secondaryEmail?.trim().toLowerCase();
    return recipient && z.email().safeParse(recipient).success
      ? [{ agentUserId: profile.userId.toString(), recipient }]
      : [];
  });
}

export function crmRegistrationOptions(to: string, data: { firstName: string; lastName: string; email: string; phone: string }): IEmailOptions {
  if (!z.email().safeParse(to).success || !z.email().safeParse(data.email).success)
    throw new Error("Valid email addresses are required");
  return { to, subject: "New Renter Registration | BeforeListed", html: "", text: crmRegistrationText(data), deliveryPolicy: "crm-single-attempt" };
}

export function crmRegistrationText(data: { firstName: string; lastName: string; email: string; phone: string }): string {
  const fields = [data.firstName, data.lastName, data.email, data.phone];
  if (fields.some(value => !value || !value.trim() || /[\r\n]/.test(value)))
    throw new Error("Complete single-line registration fields are required");
  return `First Name: ${data.firstName}\nLast Name: ${data.lastName}\nEmail: ${data.email}\nPhone: ${data.phone}`;
}

export function structuredCrmRegistration(fullName: string, email: string, phone?: string): { firstName: string; lastName: string; email: string; phone: string } | null {
  if (typeof fullName !== "string")
    return null;
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2 || !parts.every(Boolean) || !phone?.trim() || /[\r\n]/.test(phone) || !RenterUtil.validatePhoneNumber(phone) || !z.email().safeParse(email).success)
    return null;
  return { firstName: parts[0], lastName: parts.slice(1).join(" "), email, phone: phone.trim() };
}
