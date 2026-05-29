import { logger } from "@/middlewares/pino-logger";

import type { ActivityLogActionType } from "./activity-log.type";

import { ActivityLogRepository } from "./activity-log.repository";

type CreateActivityLogPayload = {
  email: string;
  actionType: ActivityLogActionType;
  reason?: string | null;
  ipAddress?: string | null;
};

export class ActivityLogService {
  private readonly repository = new ActivityLogRepository();

  async create(payload: CreateActivityLogPayload): Promise<void> {
    const normalizedEmail = payload.email.trim().toLowerCase();

    await this.repository.create({
      email: normalizedEmail,
      actionType: payload.actionType,
      reason: payload.reason ?? null,
      ipAddress: payload.ipAddress ?? null,
    } as any);

    logger.info(
      {
        email: normalizedEmail,
        actionType: payload.actionType,
        ipAddress: payload.ipAddress ?? null,
      },
      "Activity log created",
    );
  }
}
