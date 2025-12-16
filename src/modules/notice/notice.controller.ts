// file: src/modules/notice/notice.controller.ts

import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { logger } from "@/middlewares/pino-logger";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import { updateNoticeSchema } from "./notice.schema";
import { NoticeService } from "./notice.service";

export class NoticeController {
  private readonly noticeService: NoticeService;

  constructor() {
    this.noticeService = new NoticeService();
  }

  getNotice = asyncHandler(async (req: Request, res: Response) => {
    const notice = await this.noticeService.getPublicNotice();

    if (!notice) {
      return ApiResponse.success(res, null, "No active notice available");
    }

    ApiResponse.success(res, notice, "Notice retrieved");
  });

  /**
   * GET /notice/admin
   * Get notice for admin management
   * Protected: Admin only
   */
  getNoticeForAdmin = asyncHandler(async (req: Request, res: Response) => {
    const notice = await this.noticeService.getNotice();

    ApiResponse.success(res, notice, "Notice retrieved for admin");
  });

  updateNotice = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateNoticeSchema, req);
    const adminId = req.user!.userId;

    const notice = await this.noticeService.updateNotice(
      validated.body,
      adminId
    );

    logger.info({ adminId }, "Notice updated");

    ApiResponse.success(res, notice, "Notice updated successfully");
  });

  toggleNoticeStatus = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.user!.userId;

    const notice = await this.noticeService.toggleNoticeStatus(adminId);

    logger.info({ adminId, status: notice.isActive }, "Notice status toggled");

    ApiResponse.success(
      res,
      notice,
      `Notice ${notice.isActive ? "activated" : "deactivated"} successfully`
    );
  });
}
