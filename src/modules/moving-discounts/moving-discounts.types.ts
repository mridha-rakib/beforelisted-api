// file: src/modules/moving-discounts/moving-discounts.types.ts

import type {
  IMovingDiscountCategory,
  IMovingDiscountItem,
} from "./moving-discounts.model";

export type MovingDiscountCategoryResponse = IMovingDiscountCategory;
export type MovingDiscountItemResponse = IMovingDiscountItem;

export interface CreateCategoryPayload {
  title: string;
}

export interface UpdateCategoryPayload {
  title?: string;
  isActive?: boolean;
  slug?: string;
}

export interface CreateItemPayload {
  categoryId: string;
  companyName: string;
  discount: string;
  description: string;
  link: string;
}

export interface UpdateItemPayload {
  companyName?: string;
  discount?: string;
  description?: string;
  link?: string;
  isActive?: boolean;
}

export interface ReorderPayload {
  orderedIds: string[];
}

export interface ReorderItemsPayload {
  categoryId: string;
  orderedIds: string[];
}

export interface PublicMovingDiscountsResponse {
  categories: Array<
    IMovingDiscountCategory & { items: IMovingDiscountItem[] }
  >;
}
