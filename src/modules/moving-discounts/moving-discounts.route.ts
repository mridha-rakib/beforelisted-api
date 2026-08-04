// file: src/modules/moving-discounts/moving-discounts.route.ts

import { Router } from "express";

import { authMiddleware } from "@/middlewares/auth.middleware";

import { MovingDiscountController } from "./moving-discounts.controller";

const router = Router();
const controller = new MovingDiscountController();

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * GET /moving-discounts
 * Get all active categories with their active items (no pagination).
 */
router.get("/", controller.getPublicDiscounts.bind(controller));

/**
 * GET /moving-discounts/categories
 * Public list of active categories only.
 */
router.get("/categories", controller.getPublicCategories.bind(controller));

/**
 * GET /moving-discounts/items?categoryId=&page=&pageSize=
 * Public paginated items, optionally filtered by category.
 */
router.get("/items", controller.getPublicItemsPaginated.bind(controller));

// ============================================
// ADMIN — CATEGORIES
// ============================================

/**
 * GET /moving-discounts/admin/categories
 * List all categories (including inactive). Admin only.
 */
router.get(
  "/admin/categories",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getAllCategoriesForAdmin.bind(controller),
);

/**
 * GET /moving-discounts/admin/items?categoryId=...
 * List items in a category. Admin only.
 */
router.get(
  "/admin/items",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.getItemsInCategory.bind(controller),
);

/**
 * POST /moving-discounts/admin/categories
 * Create a category. Admin only.
 */
router.post(
  "/admin/categories",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.createCategory.bind(controller),
);

/**
 * PATCH /moving-discounts/admin/categories/:id
 * Rename or toggle isActive. Admin only.
 */
router.patch(
  "/admin/categories/:id",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.updateCategory.bind(controller),
);

/**
 * POST /moving-discounts/admin/categories/reorder
 * Bulk reorder categories. Admin only.
 */
router.post(
  "/admin/categories/reorder",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.reorderCategories.bind(controller),
);

/**
 * DELETE /moving-discounts/admin/categories/:id
 * Hard delete category and cascade items. Admin only.
 */
router.delete(
  "/admin/categories/:id",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.deleteCategory.bind(controller),
);

// ============================================
// ADMIN — ITEMS
// ============================================

/**
 * POST /moving-discounts/admin/items
 * Create an item inside a category. Admin only.
 */
router.post(
  "/admin/items",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.createItem.bind(controller),
);

/**
 * PATCH /moving-discounts/admin/items/:id
 * Update an item's fields. Admin only.
 */
router.patch(
  "/admin/items/:id",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.updateItem.bind(controller),
);

/**
 * POST /moving-discounts/admin/items/reorder
 * Bulk reorder items within a category. Admin only.
 */
router.post(
  "/admin/items/reorder",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.reorderItems.bind(controller),
);

/**
 * DELETE /moving-discounts/admin/items/:id
 * Delete an item. Admin only.
 */
router.delete(
  "/admin/items/:id",
  authMiddleware.verifyToken,
  authMiddleware.authorize("Admin"),
  controller.deleteItem.bind(controller),
);

export default router;
