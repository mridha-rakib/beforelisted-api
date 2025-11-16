import { mongoosePaginate } from "@/config/paginate.config";
import type { CustomPaginateModel } from "@/ts/pagination.types";
import { Document, Schema, model } from "mongoose";

// DRY utility for schema + plugin + timestamps
export function createPaginatedSchema<T extends Document>(
  schemaDefinition: Record<string, any>,
  options: Record<string, any> = {}
): Schema<T> {
  const schema = new Schema<T>(schemaDefinition, {
    timestamps: true,
    ...options,
  });
  schema.plugin(mongoosePaginate);
  return schema;
}

export function createPaginatedModel<T extends Document>(
  name: string,
  schema: Schema<T>
): CustomPaginateModel<T> {
  return model<T>(name, schema) as CustomPaginateModel<T>;
}
