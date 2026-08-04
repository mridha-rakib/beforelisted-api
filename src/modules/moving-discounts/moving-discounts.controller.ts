// file: src/modules/moving-discounts/moving-discounts.controller.ts

import type { Request, Response } from "express";

import { asyncHandler } from "@/middlewares/async-handler.middleware";
import { ApiResponse } from "@/utils/response.utils";
import { zParse } from "@/utils/validators.utils";

import {
  createCategorySchema,
  createItemSchema,
  idParamSchema,
  paginationSchema,
  reorderCategoriesSchema,
  reorderItemsSchema,
  updateCategorySchema,
  updateItemSchema,
} from "./moving-discounts.schema";
import { MovingDiscountService } from "./moving-discounts.service";

export class MovingDiscountController {
  private readonly service: MovingDiscountService;

  constructor() {
    this.service = new MovingDiscountService();
  }

  // ============================================
  // PUBLIC
  // ============================================

  getPublicDiscounts = asyncHandler(async (_req: Request, res: Response) => {
    const result = await this.service.getPublicDiscounts();
    ApiResponse.success(res, result, "Moving discounts retrieved");
  });

  getPublicItemsPaginated = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(paginationSchema, req);
    const result = await this.service.getPublicItemsPaginated(validated.query);
    ApiResponse.success(res, result, "Items retrieved");
  });

  getPublicCategories = asyncHandler(async (_req: Request, res: Response) => {
    const categories = await this.service.getAllCategoriesForAdmin();
    // Filter to active only for public consumption
    const activeOnly = categories.filter((c: any) => c.isActive !== false);
    ApiResponse.success(
      res,
      { categories: activeOnly },
      "Categories retrieved",
    );
  });

  // ============================================
  // CATEGORIES
  // ============================================

  getAllCategoriesForAdmin = asyncHandler(async (_req: Request, res: Response) => {
    const categories = await this.service.getAllCategoriesForAdmin();
    ApiResponse.success(res, { categories }, "All categories retrieved");
  });

  createCategory = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createCategorySchema, req);
    const adminId = req.user!.userId;

    const category = await this.service.createCategory(validated.body, adminId);
    ApiResponse.created(res, category, "Category created successfully");
  });

  updateCategory = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateCategorySchema, req);
    const adminId = req.user!.userId;

    const category = await this.service.updateCategory(
      String(req.params.id),
      validated.body,
      adminId,
    );
    ApiResponse.success(res, category, "Category updated successfully");
  });

  deleteCategory = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(idParamSchema, req);
    const adminId = req.user!.userId;

    await this.service.deleteCategory(validated.params.id, adminId);
    ApiResponse.success(
      res,
      { id: validated.params.id },
      "Category deleted successfully",
    );
  });

  reorderCategories = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(reorderCategoriesSchema, req);
    const adminId = req.user!.userId;

    const categories = await this.service.reorderCategories(
      validated.body,
      adminId,
    );
    ApiResponse.success(res, categories, "Categories reordered");
  });

  // ============================================
  // ITEMS
  // ============================================

  getItemsByCategoryForAdmin = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(paginationSchema, req);
    const categoryId =
      validated.query.categoryId ?? String(req.params.id ?? "");
    const result = await this.service.getAdminItemsPaginated({
      page: validated.query.page,
      pageSize: validated.query.pageSize,
      categoryId,
    });
    ApiResponse.success(res, result, "Items retrieved");
  });

  getItemsInCategory = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(paginationSchema, req);
    if (!validated.query.categoryId) {
      res.status(400).json({ message: "categoryId query param is required" });
      return;
    }
    const result = await this.service.getAdminItemsPaginated(validated.query);
    ApiResponse.success(res, result, "Items retrieved");
  });

  createItem = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(createItemSchema, req);
    const adminId = req.user!.userId;

    const item = await this.service.createItem(validated.body, adminId);
    ApiResponse.created(res, item, "Item created successfully");
  });

  updateItem = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(updateItemSchema, req);
    const adminId = req.user!.userId;

    const item = await this.service.updateItem(
      String(req.params.id),
      validated.body,
      adminId,
    );
    ApiResponse.success(res, item, "Item updated successfully");
  });

  deleteItem = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(idParamSchema, req);
    const adminId = req.user!.userId;

    await this.service.deleteItem(validated.params.id, adminId);
    ApiResponse.success(
      res,
      { id: validated.params.id },
      "Item deleted successfully",
    );
  });

  reorderItems = asyncHandler(async (req: Request, res: Response) => {
    const validated = await zParse(reorderItemsSchema, req);
    const adminId = req.user!.userId;

    const items = await this.service.reorderItems(validated.body, adminId);
    ApiResponse.success(res, items, "Items reordered");
  });
}
