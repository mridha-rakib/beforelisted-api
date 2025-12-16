// file: src/modules/notice/notice.service.ts

import { logger } from "@/middlewares/pino-logger";
import { NotFoundException } from "@/utils/app-error.utils";
import type { INotice } from "./notice.model";
import { NoticeRepository } from "./notice.repository";

export class NoticeService {
  private readonly noticeRepository: NoticeRepository;

  constructor() {
    this.noticeRepository = new NoticeRepository();
  }

  async getNotice(): Promise<INotice> {
    const notice = await this.noticeRepository.getOrCreateNotice();

    logger.debug({ noticeId: notice._id }, "Notice retrieved");

    return notice;
  }

  async updateNotice(
    data: Partial<INotice>,
    adminId: string
  ): Promise<INotice> {
    const notice = await this.noticeRepository.updateNotice(data, adminId);

    if (!notice) {
      throw new NotFoundException("Notice not found");
    }

    logger.info({ adminId, noticeId: notice._id }, "Notice updated");

    return notice;
  }

  async getPublicNotice(): Promise<INotice | null> {
    const notice = await this.noticeRepository.getNotice();

    if (notice && notice.isActive) {
      return notice;
    }

    return null;
  }

  async toggleNoticeStatus(adminId: string): Promise<INotice> {
    const notice = await this.noticeRepository.getNotice();

    if (!notice) {
      throw new NotFoundException("Notice not found");
    }

    const updated = await this.noticeRepository.updateNotice(
      { isActive: !notice.isActive },
      adminId
    );

    if (!updated) {
      throw new NotFoundException("Failed to toggle notice status");
    }

    return updated;
  }
}
