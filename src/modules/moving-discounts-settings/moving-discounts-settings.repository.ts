// file: src/modules/moving-discounts-settings/moving-discounts-settings.repository.ts

import { MovingDiscountSettings } from "./moving-discounts-settings.model";

import type { IMovingDiscountSettings } from "./moving-discounts-settings.model";

export class MovingDiscountSettingsRepository {
  private readonly model: typeof MovingDiscountSettings;

  constructor() {
    this.model = MovingDiscountSettings;
  }

  async getSingleton(): Promise<IMovingDiscountSettings> {
    const existing = await this.model.findById("singleton");
    if (existing) return existing;
    return this.model.create({
      _id: "singleton",
      disclaimer: "",
    });
  }

  async updateDisclaimer(
    disclaimer: string,
    updatedBy?: string,
  ): Promise<IMovingDiscountSettings> {
    const update: Record<string, unknown> = { disclaimer };
    if (updatedBy) update.updatedBy = updatedBy;

    return this.model.findByIdAndUpdate(
      "singleton",
      { $set: update, $setOnInsert: { _id: "singleton" } },
      { new: true, upsert: true },
    ) as Promise<IMovingDiscountSettings>;
  }
}
