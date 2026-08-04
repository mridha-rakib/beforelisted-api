// file: src/modules/moving-discounts/moving-discounts.service.ts

import { logger } from "@/middlewares/pino-logger";
import {
  BadRequestException,
  NotFoundException,
} from "@/utils/app-error.utils";

import type {
  CreateCategoryPayload,
  CreateItemPayload,
  PublicMovingDiscountsResponse,
  ReorderItemsPayload,
  ReorderPayload,
  UpdateCategoryPayload,
  UpdateItemPayload,
} from "./moving-discounts.types";
import type { PaginationParams } from "./moving-discounts.schema";
import type {
  IMovingDiscountCategory,
  IMovingDiscountItem,
} from "./moving-discounts.model";

import {
  MovingDiscountCategoryRepository,
  MovingDiscountItemRepository,
} from "./moving-discounts.repository";

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export class MovingDiscountService {
  private readonly categoryRepo: MovingDiscountCategoryRepository;
  private readonly itemRepo: MovingDiscountItemRepository;

  constructor() {
    this.categoryRepo = new MovingDiscountCategoryRepository();
    this.itemRepo = new MovingDiscountItemRepository();
  }

  // ============================================
  // PUBLIC
  // ============================================

  async getPublicDiscounts(): Promise<PublicMovingDiscountsResponse> {
    const categories = await this.categoryRepo.getAllCategories(true);
    const categoryIds = categories.map(c => c._id.toString());
    const items = await Promise.all(
      categoryIds.map(id => this.itemRepo.getItemsByCategory(id, true)),
    );

    const categoriesWithItems = categories.map((category, idx) => ({
      ...category.toObject(),
      items: items[idx],
    }));

    return { categories: categoriesWithItems };
  }

  async getPublicItemsPaginated(
    params: PaginationParams,
  ): Promise<{
    items: IMovingDiscountItem[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
    category?: IMovingDiscountCategory | null;
  }> {
    let category: IMovingDiscountCategory | null = null;
    if (params.categoryId) {
      category = await this.categoryRepo.getCategoryById(params.categoryId);
      if (!category || !category.isActive) {
        throw new NotFoundException("Category not found");
      }
    }

    const result = await this.itemRepo.getItemsByCategoryPaginated(
      params.categoryId,
      params.page,
      params.pageSize,
      true,
    );

    return {
      items: result.items,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
      category,
    };
  }

  async getAdminItemsPaginated(
    params: PaginationParams,
  ): Promise<{
    items: IMovingDiscountItem[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    if (params.categoryId) {
      const category = await this.categoryRepo.getCategoryById(params.categoryId);
      if (!category) {
        throw new NotFoundException("Category not found");
      }
    }

    const result = await this.itemRepo.getItemsByCategoryPaginated(
      params.categoryId,
      params.page,
      params.pageSize,
    );

    return {
      items: result.items,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  // ============================================
  // CATEGORIES
  // ============================================

  async getAllCategoriesForAdmin(): Promise<IMovingDiscountCategory[]> {
    return this.categoryRepo.getAllCategories();
  }

  async getCategoryById(id: string): Promise<IMovingDiscountCategory> {
    const category = await this.categoryRepo.getCategoryById(id);
    if (!category) {
      throw new NotFoundException("Category not found");
    }
    return category;
  }

  async createCategory(
    payload: CreateCategoryPayload,
    adminId: string,
  ): Promise<IMovingDiscountCategory> {
    const baseSlug = slugify(payload.title);
    if (!baseSlug) {
      throw new BadRequestException("Title must contain at least one letter or number");
    }

    const slug = await this.ensureUniqueSlug(baseSlug);

    const maxOrder = await this.categoryRepo.getMaxOrder();

    const category = await this.categoryRepo.createCategory(
      {
        title: payload.title.trim(),
        slug,
        order: maxOrder + 1,
      },
      adminId,
    );

    logger.info({ adminId, categoryId: category._id }, "Moving discount category created");
    return category;
  }

  async updateCategory(
    id: string,
    payload: UpdateCategoryPayload,
    adminId: string,
  ): Promise<IMovingDiscountCategory> {
    const existing = await this.categoryRepo.getCategoryById(id);
    if (!existing) {
      throw new NotFoundException("Category not found");
    }

    if (payload.title && payload.title.trim() !== existing.title) {
      const newSlug = slugify(payload.title);
      if (newSlug && newSlug !== existing.slug) {
        payload.slug = await this.ensureUniqueSlug(newSlug, id);
      }
    }

    const updated = await this.categoryRepo.updateCategory(
      id,
      {
        ...(payload.title !== undefined ? { title: payload.title.trim() } : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
        ...(payload.slug !== undefined ? { slug: payload.slug } : {}),
      },
      adminId,
    );

    if (!updated) {
      throw new NotFoundException("Category not found");
    }

    logger.info({ adminId, categoryId: id }, "Moving discount category updated");
    return updated;
  }

  async deleteCategory(id: string, adminId: string): Promise<void> {
    const category = await this.categoryRepo.getCategoryById(id);
    if (!category) {
      throw new NotFoundException("Category not found");
    }

    // Cascade: remove all items that belong to this category
    await this.itemRepo.deleteItemsByCategory(id);
    await this.categoryRepo.deleteCategory(id);

    logger.warn(
      { adminId, categoryId: id, title: category.title },
      "Moving discount category deleted (cascaded items)",
    );
  }

  async reorderCategories(
    payload: ReorderPayload,
    adminId: string,
  ): Promise<IMovingDiscountCategory[]> {
    const categories = await this.categoryRepo.getAllCategories();
    const validIds = new Set(categories.map(c => c._id.toString()));
    const requested = payload.orderedIds;

    if (requested.length !== categories.length) {
      throw new BadRequestException(
        "orderedIds must include every existing category exactly once",
      );
    }

    for (const id of requested) {
      if (!validIds.has(id)) {
        throw new BadRequestException(`Unknown category id: ${id}`);
      }
    }

    for (let i = 0; i < requested.length; i++) {
      await this.categoryRepo.updateCategory(requested[i], { order: i }, adminId);
    }

    logger.info(
      { adminId, count: requested.length },
      "Moving discount categories reordered",
    );
    return this.categoryRepo.getAllCategories();
  }

  // ============================================
  // ITEMS
  // ============================================

  async getItemsByCategoryForAdmin(
    categoryId: string,
  ): Promise<IMovingDiscountItem[]> {
    const category = await this.categoryRepo.getCategoryById(categoryId);
    if (!category) {
      throw new NotFoundException("Category not found");
    }
    return this.itemRepo.getItemsByCategory(categoryId);
  }

  async createItem(
    payload: CreateItemPayload,
    adminId: string,
  ): Promise<IMovingDiscountItem> {
    const category = await this.categoryRepo.getCategoryById(payload.categoryId);
    if (!category) {
      throw new NotFoundException("Category not found");
    }

    const maxOrder = await this.itemRepo.getMaxOrderByCategory(
      payload.categoryId,
    );

    const item = await this.itemRepo.createItem(
      {
        categoryId: payload.categoryId as any,
        companyName: payload.companyName.trim(),
        discount: payload.discount.trim(),
        description: payload.description.trim(),
        link: payload.link.trim(),
        order: maxOrder + 1,
      },
      adminId,
    );

    logger.info(
      { adminId, itemId: item._id, categoryId: payload.categoryId },
      "Moving discount item created",
    );
    return item;
  }

  async updateItem(
    id: string,
    payload: UpdateItemPayload,
    adminId: string,
  ): Promise<IMovingDiscountItem> {
    const existing = await this.itemRepo.getItemById(id);
    if (!existing) {
      throw new NotFoundException("Item not found");
    }

    const updated = await this.itemRepo.updateItem(
      id,
      {
        ...(payload.companyName !== undefined
          ? { companyName: payload.companyName.trim() }
          : {}),
        ...(payload.discount !== undefined
          ? { discount: payload.discount.trim() }
          : {}),
        ...(payload.description !== undefined
          ? { description: payload.description.trim() }
          : {}),
        ...(payload.link !== undefined ? { link: payload.link.trim() } : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      },
      adminId,
    );

    if (!updated) {
      throw new NotFoundException("Item not found");
    }

    logger.info({ adminId, itemId: id }, "Moving discount item updated");
    return updated;
  }

  async deleteItem(id: string, adminId: string): Promise<void> {
    const existing = await this.itemRepo.getItemById(id);
    if (!existing) {
      throw new NotFoundException("Item not found");
    }
    await this.itemRepo.deleteItem(id);
    logger.warn({ adminId, itemId: id }, "Moving discount item deleted");
  }

  async reorderItems(
    payload: ReorderItemsPayload,
    adminId: string,
  ): Promise<IMovingDiscountItem[]> {
    const category = await this.categoryRepo.getCategoryById(payload.categoryId);
    if (!category) {
      throw new NotFoundException("Category not found");
    }

    const items = await this.itemRepo.getItemsByCategory(payload.categoryId);
    const validIds = new Set(items.map(i => i._id.toString()));

    if (payload.orderedIds.length !== items.length) {
      throw new BadRequestException(
        "orderedIds must include every item in this category exactly once",
      );
    }

    for (const id of payload.orderedIds) {
      if (!validIds.has(id)) {
        throw new BadRequestException(`Unknown item id: ${id}`);
      }
    }

    for (let i = 0; i < payload.orderedIds.length; i++) {
      await this.itemRepo.updateItem(
        payload.orderedIds[i],
        { order: i } as any,
        adminId,
      );
    }

    logger.info(
      { adminId, categoryId: payload.categoryId, count: payload.orderedIds.length },
      "Moving discount items reordered",
    );
    return this.itemRepo.getItemsByCategory(payload.categoryId);
  }

  // ============================================
  // Helpers
  // ============================================

  private async ensureUniqueSlug(
    baseSlug: string,
    excludeId?: string,
  ): Promise<string> {
    let candidate = baseSlug;
    let counter = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.categoryRepo.getCategoryBySlug(candidate);
      if (!existing || (excludeId && existing._id.toString() === excludeId)) {
        return candidate;
      }
      counter += 1;
      candidate = `${baseSlug}-${counter}`;
      if (counter > 1000) {
        throw new BadRequestException(
          "Could not generate a unique slug; please choose a different title",
        );
      }
    }
  }
}
