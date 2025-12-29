// file: src/modules/support/support.service.ts

import { env } from "@/env";
import { logger } from "@/middlewares/pino-logger";
import { emailService } from "@/services/email.service";
import { InternalServerException } from "@/utils/app-error.utils";

export interface ContactAdminInput {
  email: string;
  subject: string;
  message: string;
  ipAddress?: string;
  userAgent?: string;
}

export class SupportService {
  async sendContactMessage(
    payload: ContactAdminInput
  ): Promise<{ messageId?: string }> {
    const subject = payload.subject.replace(/[\r\n]+/g, " ").trim();
    const message = payload.message.trim();

    const result = await emailService.sendAdminContactRequest({
      to: env.ADMIN_EMAIL,
      senderEmail: payload.email.trim().toLowerCase(),
      subject: subject || "New contact message from public user",
      message,
      receivedAt: new Date().toLocaleString("en-US"),
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent,
    });

    if (!result.success) {
      logger.error(
        {
          email: payload.email,
          error: result.error instanceof Error ? result.error.message : result.error,
        },
        "Failed to deliver public contact message"
      );
      throw new InternalServerException("Failed to send message");
    }

    logger.info({ email: payload.email }, "Public contact message sent");

    return { messageId: result.messageId };
  }
}
