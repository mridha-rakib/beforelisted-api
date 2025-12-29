// file: src/modules/support/support.controller.ts

import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import { contactAdminSchema } from "./support.schema";
import { SupportService } from "./support.service";

export class SupportController {
  private supportService: SupportService;

  constructor() {
    this.supportService = new SupportService();
  }

  sendContactMessage = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(contactAdminSchema, req);

    const result = await this.supportService.sendContactMessage({
      email: validated.body.email,
      subject: validated.body.subject,
      message: validated.body.message,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent") || undefined,
    });

    ApiResponse.success(res, result, "Message sent successfully");
  });
}
