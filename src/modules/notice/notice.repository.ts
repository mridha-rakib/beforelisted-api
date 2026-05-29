// file: src/modules/notice/notice.repository.ts

import type { INotice } from "./notice.model";

import { BaseRepository } from "../base/base.repository";
import { Notice } from "./notice.model";

export class NoticeRepository extends BaseRepository<INotice> {
  constructor() {
    super(Notice);
  }

  async getNotice(): Promise<INotice | null> {
    return this.model.findOne().populate("createdBy", "fullName email");
  }

  async getOrCreateNotice(): Promise<INotice> {
    let notice = await this.getNotice();

    if (!notice) {
      notice = new this.model({
        title: "System Notice",
        content: "",
        isActive: true,
      });
      await notice.save();
    }

    return notice;
  }

  async updateNotice(
    data: Partial<INotice>,
    updatedBy: string,
  ): Promise<INotice | null> {
    const notice = await this.model.findOneAndUpdate(
      {},
      {
        ...data,
        updatedBy,
        updatedAt: new Date(),
      },
      { new: true },
    );

    return notice;
  }
}
