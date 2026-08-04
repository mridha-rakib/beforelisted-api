// file: src/modules/moving-discounts-settings/moving-discounts-settings.controller.ts

import type { Request, Response } from "express";

import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";

import { updateSettingsSchema } from "./moving-discounts-settings.schema";
import { MovingDiscountSettingsService } from "./moving-discounts-settings.service";

export class MovingDiscountSettingsController {
  private readonly service: MovingDiscountSettingsService;

  constructor() {
    this.service = new MovingDiscountSettingsService();
  }

  getPublicSettings = asyncHandler(async (_req: Request, res: Response) => {
    const settings = await this.service.getSettings();
    ApiResponse.success(res, { disclaimer: settings.disclaimer });
  });

  getAdminSettings = asyncHandler(async (_req: Request, res: Response) => {
    const settings = await this.service.getSettings();
    ApiResponse.success(res, { disclaimer: settings.disclaimer });
  });

  updateDisclaimer = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateSettingsSchema, req);
    const adminId = req.user?.userId;

    const updated = await this.service.updateDisclaimer(
      validated.body.disclaimer,
      adminId,
    );

    ApiResponse.success(
      res,
      { disclaimer: updated.disclaimer },
      "Disclaimer updated successfully",
    );
  });
}
