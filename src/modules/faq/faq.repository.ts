// file: src/modules/faq/faq.repository.ts

import { BaseRepository } from "../base/base.repository";
import { FAQ, type IFAQ } from "./faq.model";

export class FAQRepository extends BaseRepository<IFAQ> {
  constructor() {
    super(FAQ);
  }

  /**
   * Get all active FAQs ordered by sequence
   */
  async getAllFAQs(isActive: boolean = true): Promise<IFAQ[]> {
    return this.model
      .find({ isActive })
      .sort({ order: 1, createdAt: -1 })
      .populate("createdBy", "fullName email");
  }

  /**
   * Get FAQs by category
   */
  async getFAQsByCategory(
    category: string,
    isActive: boolean = true
  ): Promise<IFAQ[]> {
    return this.model
      .find({ category, isActive })
      .sort({ order: 1, createdAt: -1 })
      .populate("createdBy", "fullName email");
  }

  /**
   * Get single FAQ by ID
   */
  async getFAQById(id: string): Promise<IFAQ | null> {
    return this.model
      .findById(id)
      .populate("createdBy", "fullName email")
      .populate("updatedBy", "fullName email");
  }

  /**
   * Create new FAQ
   */
  async createFAQ(data: Partial<IFAQ>, createdBy: string): Promise<IFAQ> {
    const faq = new this.model({
      ...data,
      createdBy,
    });
    return faq.save();
  }

  /**
   * Update FAQ
   */
  async updateFAQ(
    id: string,
    data: Partial<IFAQ>,
    updatedBy: string
  ): Promise<IFAQ | null> {
    return this.model.findByIdAndUpdate(
      id,
      {
        ...data,
        updatedBy,
        updatedAt: new Date(),
      },
      { new: true }
    );
  }

  /**
   * Delete FAQ (soft delete - set isActive to false)
   */
  async deleteFAQ(id: string, updatedBy: string): Promise<IFAQ | null> {
    return this.model.findByIdAndUpdate(
      id,
      {
        isActive: false,
        updatedBy,
        updatedAt: new Date(),
      },
      { new: true }
    );
  }

  /**
   * Get max order number (for sequence)
   */
  async getMaxOrder(): Promise<number> {
    const result = await this.model
      .findOne()
      .sort({ order: -1 })
      .select("order");

    return result as any;
  }

  /**
   * Reorder FAQ
   */
  async reorderFAQ(id: string, newOrder: number): Promise<IFAQ | null> {
    return this.model.findByIdAndUpdate(id, { order: newOrder }, { new: true });
  }

  /**
   * Hard delete FAQ (permanent removal from database)
   * Use with caution - data cannot be recovered
   */
  async hardDeleteFAQ(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id);
  }
}
