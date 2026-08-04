// file: src/modules/moving-discounts-settings/moving-discounts-settings.service.ts

import { logger } from "@/middlewares/pino-logger";

import { MovingDiscountSettingsRepository } from "./moving-discounts-settings.repository";

import type { IMovingDiscountSettings } from "./moving-discounts-settings.model";

export class MovingDiscountSettingsService {
  private readonly repo: MovingDiscountSettingsRepository;

  constructor() {
    this.repo = new MovingDiscountSettingsRepository();
  }

  async getSettings(): Promise<IMovingDiscountSettings> {
    return this.repo.getSingleton();
  }

  async updateDisclaimer(
    disclaimer: string,
    adminId?: string,
  ): Promise<IMovingDiscountSettings> {
    const updated = await this.repo.updateDisclaimer(disclaimer, adminId);
    logger.info(
      { adminId, length: disclaimer.length },
      "Moving discount disclaimer updated",
    );
    return updated;
  }
}
