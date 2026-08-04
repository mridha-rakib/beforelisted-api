// file: src/modules/moving-discounts/moving-discounts.repository.ts

import type {
  IMovingDiscountCategory,
  IMovingDiscountItem,
} from "./moving-discounts.model";

import { BaseRepository } from "../base/base.repository";
import {
  MovingDiscountCategory,
  MovingDiscountItem,
} from "./moving-discounts.model";

export class MovingDiscountCategoryRepository extends BaseRepository<IMovingDiscountCategory> {
  constructor() {
    super(MovingDiscountCategory);
  }

  async getAllCategories(isActive?: boolean): Promise<IMovingDiscountCategory[]> {
    const filter = isActive === undefined ? {} : { isActive };
    return this.model
      .find(filter)
      .sort({ order: 1, createdAt: -1 })
      .populate("createdBy", "fullName email")
      .populate("updatedBy", "fullName email");
  }

  async getCategoryById(id: string): Promise<IMovingDiscountCategory | null> {
    return this.model
      .findById(id)
      .populate("createdBy", "fullName email")
      .populate("updatedBy", "fullName email");
  }

  async getCategoryBySlug(slug: string): Promise<IMovingDiscountCategory | null> {
    return this.model.findOne({ slug });
  }

  async createCategory(
    data: Partial<IMovingDiscountCategory>,
    createdBy: string,
  ): Promise<IMovingDiscountCategory> {
    return this.model.create({
      ...data,
      createdBy,
    });
  }

  async updateCategory(
    id: string,
    data: Partial<IMovingDiscountCategory>,
    updatedBy: string,
  ): Promise<IMovingDiscountCategory | null> {
    return this.model.findByIdAndUpdate(
      id,
      {
        ...data,
        updatedBy,
        updatedAt: new Date(),
      },
      { new: true },
    );
  }

  async deleteCategory(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id);
  }

  async getMaxOrder(): Promise<number> {
    const result = await this.model
      .findOne()
      .sort({ order: -1 })
      .select("order");

    return (result as any)?.order ?? -1;
  }
}

export class MovingDiscountItemRepository extends BaseRepository<IMovingDiscountItem> {
  constructor() {
    super(MovingDiscountItem);
  }

  async getItemsByCategory(
    categoryId: string,
    isActive?: boolean,
  ): Promise<IMovingDiscountItem[]> {
    const filter: any = { categoryId };
    if (isActive !== undefined) filter.isActive = isActive;
    return this.model
      .find(filter)
      .sort({ order: 1, createdAt: -1 });
  }

  async getItemsByCategoryPaginated(
    categoryId: string | undefined,
    page: number,
    pageSize: number,
    isActive?: boolean,
  ): Promise<{
    items: IMovingDiscountItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const filter: any = {};
    if (categoryId) filter.categoryId = categoryId;
    if (isActive !== undefined) filter.isActive = isActive;

    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      this.model.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getItemById(id: string): Promise<IMovingDiscountItem | null> {
    return this.model.findById(id);
  }

  async createItem(
    data: Partial<IMovingDiscountItem>,
    createdBy: string,
  ): Promise<IMovingDiscountItem> {
    return this.model.create({
      ...data,
      createdBy,
    });
  }

  async updateItem(
    id: string,
    data: Partial<IMovingDiscountItem>,
    updatedBy: string,
  ): Promise<IMovingDiscountItem | null> {
    return this.model.findByIdAndUpdate(
      id,
      {
        ...data,
        updatedBy,
        updatedAt: new Date(),
      },
      { new: true },
    );
  }

  async deleteItem(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id);
  }

  async deleteItemsByCategory(categoryId: string): Promise<void> {
    await this.model.deleteMany({ categoryId });
  }

  async getMaxOrderByCategory(categoryId: string): Promise<number> {
    const result = await this.model
      .findOne({ categoryId })
      .sort({ order: -1 })
      .select("order");

    return (result as any)?.order ?? -1;
  }
}
