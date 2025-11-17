// import { mongoosePaginate } from "@/config/paginate.config";
// import type { CustomPaginateModel } from "@/ts/pagination.types";
// import { Document, Schema, model } from "mongoose";

// // DRY utility for schema + plugin + timestamps
// export function createPaginatedSchema<T extends Document>(
//   schemaDefinition: Record<string, any>,
//   options: Record<string, any> = {}
// ): Schema<T> {
//   const schema = new Schema<T>(schemaDefinition, {
//     timestamps: true,
//     ...options,
//   });
//   schema.plugin(mongoosePaginate);
//   return schema;
// }

// export function createPaginatedModel<T extends Document>(
//   name: string,
//   schema: Schema<T>
// ): CustomPaginateModel<T> {
//   return model<T>(name, schema) as CustomPaginateModel<T>;
// }

// file: src/utils/base-schema.utils.ts
import { mongoosePaginate } from "@/config/paginate.config";
import type { SchemaDefinition, SchemaOptions } from "mongoose";
import { Schema } from "mongoose";

/**
Base Schema Utility
DRY utility to create Mongoose schemas with common configuration
Create a standard schema with timestamps and pagination
@param definition - Schema field definitions
@param options - Additional schema options
@returns Configured Mongoose Schema
*/

// export class BaseSchemaUtil {
//   static createSchema<T>(
//     definition: SchemaDefinition<T>,
//     options: SchemaOptions<T> = {}
//   ): Schema<T> {
//     const schema = new Schema<T>(definition, {
//       timestamps: true,
//       ...options,
//     });

//     schema.plugin(mongoosePaginate);
//     return schema;
//   }

//   /**
//    *Create a schema with custom index configurations
//    */
//   static createIndexedSchema<T>(
//     definition: SchemaDefinition,
//     indexConfig?: Record<string, any>,
//     options: SchemaOptions = {}
//   ): Schema<T> {
//     const schema = this.createSchema<T>(definition, options);

//     if (indexConfig) {
//       Object.entries(indexConfig).forEach(([fieldName, indexOptions]) => {
//         schema.index({ [fieldName]: 1 }, indexOptions);
//       });
//     }

//     return schema;
//   }

//   /**
//    *Standard audit fields to add to any schema
//    */
//   static auditFields() {
//     return {
//       createdBy: {
//         type: Schema.Types.ObjectId,
//         ref: "User",
//       },
//       updatedBy: {
//         type: Schema.Types.ObjectId,
//         ref: "User",
//       },
//       deletedAt: Date,
//       deletedBy: {
//         type: Schema.Types.ObjectId,
//         ref: "User",
//       },
//     };
//   }

//   /**
//    *Standard soft delete fields
//    */
//   static softDeleteFields() {
//     return {
//       isDeleted: {
//         type: Boolean,
//         default: false,
//         index: true,
//       },
//       deletedAt: {
//         type: Date,
//         index: true,
//       },
//     };
//   }

//   /**
//    *Standard status field (commonly used)
//    */
//   static statusField(enumValues: string[]) {
//     return {
//       status: {
//         type: String,
//         enum: enumValues,
//         default: enumValues,
//         index: true,
//       },
//     };
//   }

//   /**
//    *Standard email field (with unique, lowercase, trim)
//    */
//   static emailField(unique: boolean = true) {
//     return {
//       email: {
//         type: String,
//         required: true,
//         unique,
//         lowercase: true,
//         trim: true,
//         index: true,
//       },
//     };
//   }

//   /**
//    *Standard password field
//    */
//   static passwordField() {
//     return {
//       password: {
//         type: String,
//         required: true,
//         minlength: 8,
//         select: false, // Don't include in queries by default
//       },
//     };
//   }

//   /**
//    *Standard phone field
//    */
//   static phoneField() {
//     return {
//       phoneNumber: {
//         type: String,
//         sparse: true,
//         trim: true,
//       },
//     };
//   }

//   /**
//    *Standard timestamp fields (manual control)
//    */
//   static timestampFields() {
//     return {
//       createdAt: {
//         type: Date,
//         default: Date.now,
//         index: true,
//       },
//       updatedAt: {
//         type: Date,
//         default: Date.now,
//       },
//     };
//   }

//   /**
//    *Merge multiple field definitions
//    *Useful for composing schema definitions
//    */
//   static mergeDefinitions(
//     ...definitions: Record<string, any>[]
//   ): Record<string, any> {
//     return definitions.reduce((acc, def) => ({ ...acc, ...def }), {});
//   }
// }

// ================================================

// file: src/utils/base-schema.utils.ts

export class BaseSchemaUtil {
  static createSchema<T>(
    definition: SchemaDefinition<T>,
    options: SchemaOptions<T> = {}
  ): Schema<T> {
    // Create schema with ONLY timestamps - no spread operator
    const schema = new Schema<T>(definition, {
      timestamps: true,
    });

    // Apply remaining options AFTER schema creation via schema.set()
    if (options && Object.keys(options).length > 0) {
      Object.keys(options).forEach((key) => {
        const value = (options as Record<string, any>)[key];
        if (value !== undefined) {
          schema.set(key as any, value);
        }
      });
    }

    // Add pagination plugin
    schema.plugin(mongoosePaginate);

    return schema;
  }

  static createIndexedSchema<T>(
    definition: SchemaDefinition<T>,
    indexConfig?: Record<string, any>,
    options: SchemaOptions<T> = {}
  ): Schema<T> {
    const schema = this.createSchema<T>(definition, options);

    if (indexConfig) {
      Object.entries(indexConfig).forEach(([fieldName, indexOptions]) => {
        schema.index({ [fieldName]: 1 }, indexOptions);
      });
    }

    return schema;
  }

  static auditFields() {
    return {
      createdBy: { type: Schema.Types.ObjectId, ref: "User" },
      updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
      deletedAt: Date,
      deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
    } as const;
  }

  static softDeleteFields() {
    return {
      isDeleted: { type: Boolean, default: false, index: true },
      deletedAt: { type: Date, index: true },
    } as const;
  }

  static statusField(enumValues: string[]) {
    return {
      status: {
        type: String,
        enum: enumValues,
        default: enumValues[0],
        index: true,
      },
    } as const;
  }

  static emailField(unique: boolean = true) {
    return {
      email: {
        type: String,
        required: true,
        unique,
        lowercase: true,
        trim: true,
        index: true,
      },
    } as const;
  }

  static passwordField() {
    return {
      password: { type: String, required: true, minlength: 8, select: false },
    } as const;
  }

  static phoneField() {
    return {
      phoneNumber: { type: String, sparse: true, trim: true },
    } as const;
  }

  static timestampFields() {
    return {
      createdAt: { type: Date, default: Date.now, index: true },
      updatedAt: { type: Date, default: Date.now },
    } as const;
  }

  static mergeDefinitions(
    ...definitions: Record<string, any>[]
  ): Record<string, any> {
    return definitions.reduce((acc, def) => ({ ...acc, ...def }), {});
  }
}
