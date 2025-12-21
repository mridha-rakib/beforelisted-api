// file: src/modules/faq/faq.service.ts

import { logger } from "@/middlewares/pino-logger";
import {
  BadRequestException,
  NotFoundException,
} from "@/utils/app-error.utils";
import type { IFAQ } from "./faq.model";
import { FAQRepository } from "./faq.repository";

export class FAQService {
  private readonly faqRepository: FAQRepository;

  constructor() {
    this.faqRepository = new FAQRepository();
  }

  async getAllFAQs(isActive: boolean = true): Promise<IFAQ[]> {
    const faqs = await this.faqRepository.find();
    console.log("++++++++++++++++++++++++++++++++++++++++");
    logger.info(faqs, "All FAQs retrieved");
    console.log("++++++++++++++++++++++++++++++++++++++++");

    return faqs;
  }

  async getFAQsByCategory(
    category: string,
    isActive: boolean = true
  ): Promise<IFAQ[]> {
    const faqs = await this.faqRepository.getFAQsByCategory(category, isActive);

    logger.debug(
      { category, count: faqs.length },
      "FAQs by category retrieved"
    );

    return faqs;
  }

  async getFAQById(id: string): Promise<IFAQ> {
    const faq = await this.faqRepository.getFAQById(id);

    if (!faq) {
      throw new NotFoundException("FAQ not found");
    }

    return faq;
  }

  async createFAQ(data: Partial<IFAQ>, adminId: string): Promise<IFAQ> {
    // Get max order and increment
    const maxOrder = await this.faqRepository.getMaxOrder();

    const faq = await this.faqRepository.createFAQ(
      {
        ...data,
      },
      adminId
    );

    return faq;
  }

  async updateFAQ(
    id: string,
    data: Partial<IFAQ>,
    adminId: string
  ): Promise<IFAQ> {
    const faq = await this.faqRepository.updateFAQ(id, data, adminId);

    if (!faq) {
      throw new NotFoundException("FAQ not found");
    }

    logger.info({ adminId, faqId: faq._id }, "FAQ updated");

    return faq;
  }

  async deleteFAQ(id: string, adminId: string): Promise<IFAQ> {
    const faq = await this.faqRepository.deleteFAQ(id, adminId);

    if (!faq) {
      throw new NotFoundException("FAQ not found");
    }

    logger.warn({ adminId, faqId: id }, "FAQ deleted");

    return faq;
  }

  async reorderFAQ(id: string, newOrder: number): Promise<IFAQ> {
    if (newOrder < 0) {
      throw new BadRequestException("Order must be a positive number");
    }

    const faq = await this.faqRepository.reorderFAQ(id, newOrder);

    if (!faq) {
      throw new NotFoundException("FAQ not found");
    }

    logger.info({ faqId: id, newOrder }, "FAQ reordered");

    return faq;
  }

  async getPublicFAQs(): Promise<IFAQ[]> {
    return this.faqRepository.getAllFAQs(true);
  }

  async getPublicFAQsByCategory(category: string): Promise<IFAQ[]> {
    return this.faqRepository.getFAQsByCategory(category, true);
  }

  /**
   * Hard delete FAQ (permanent removal)
   * Warning: This is irreversible - data cannot be recovered
   */
  async hardDeleteFAQ(id: string, adminId: string): Promise<void> {
    const faq = await this.faqRepository.getFAQById(id);

    if (!faq) {
      throw new NotFoundException("FAQ not found");
    }

    await this.faqRepository.hardDeleteFAQ(id);

    logger.warn(
      { adminId, faqId: id, question: faq.question },
      "FAQ hard deleted (permanent removal)"
    );
  }
}
