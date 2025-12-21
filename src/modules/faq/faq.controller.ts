// file: src/modules/faq/faq.controller.ts

import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { logger } from "@/middlewares/pino-logger";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";
import type { Request, Response } from "express";
import { createFAQSchema, updateFAQSchema } from "./faq.schema";
import { FAQService } from "./faq.service";

export class FAQController {
  private readonly faqService: FAQService;

  constructor() {
    this.faqService = new FAQService();
  }

  /**
   * GET /faq
   * Get all public FAQs
   * No auth required
   */
  getAllFAQs = asyncHandler(async (req: Request, res: Response) => {
    const faqs = await this.faqService.getPublicFAQs();

    ApiResponse.success(res, faqs, "All FAQs retrieved");
  });

  /**
   * GET /faq/:id
   * Get single FAQ by ID
   * No auth required
   */
  getFAQById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const faq = await this.faqService.getFAQById(id);

    ApiResponse.success(res, faq, "FAQ retrieved");
  });

  // =============================================
  // ADMIN ROUTES (Below)
  // =============================================

  /**
   * GET /faq/admin/all
   * Get all FAQs (including inactive)
   * Protected: Admin only
   */
  getAllFAQsForAdmin = asyncHandler(async (req: Request, res: Response) => {
    const faqs = await this.faqService.getAllFAQs(false);

    console.log("++++++++++++++++++++++++++++++++++++++++");
    console.log("Admin accessed all FAQs", faqs);
    console.log("++++++++++++++++++++++++++++++++++++++++");

    ApiResponse.success(res, faqs, "All FAQs retrieved for admin");
  });

  /**
   * POST /faq/admin
   * Create new FAQ
   * Protected: Admin only
   */
  createFAQ = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createFAQSchema, req);
    const adminId = req.user!.userId;

    const faq = await this.faqService.createFAQ(validated.body, adminId);

    logger.info({ adminId, faqId: faq._id }, "FAQ created");

    ApiResponse.created(res, faq, "FAQ created successfully");
  });

  /**
   * PUT /faq/admin/:id
   * Update FAQ
   * Protected: Admin only
   */
  updateFAQ = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateFAQSchema, req);
    const { id } = req.params;
    const adminId = req.user!.userId;

    const faq = await this.faqService.updateFAQ(id, validated.body, adminId);

    logger.info({ adminId, faqId: id }, "FAQ updated");

    ApiResponse.success(res, faq, "FAQ updated successfully");
  });

  /**
   * DELETE /faq/admin/:id
   * Delete FAQ (soft delete)
   * Protected: Admin only
   */
  deleteFAQ = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.userId;

    const faq = await this.faqService.deleteFAQ(id, adminId);

    logger.warn({ adminId, faqId: id }, "FAQ deleted");

    ApiResponse.success(res, faq, "FAQ deleted successfully");
  });

  /**
   * HARD DELETE /faq/admin/:id/hard-delete
   * Permanently delete FAQ from database (irreversible)
   * Protected: Admin only
   */
  hardDeleteFAQ = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.userId;

    await this.faqService.hardDeleteFAQ(id, adminId);

    logger.warn({ adminId, faqId: id }, "FAQ hard deleted");

    ApiResponse.success(
      res,
      { message: "FAQ permanently deleted" },
      "FAQ permanently deleted successfully"
    );
  });
}
