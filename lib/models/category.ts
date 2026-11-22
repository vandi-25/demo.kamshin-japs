import { type HydratedDocument, type InferSchemaType, model, models, Schema } from "mongoose";

import { baseSchemaOptions } from "./shared";

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // shown on the collection cards
    tagline: { type: String, trim: true },
  },
  baseSchemaOptions,
);

// MongoDB has no foreign keys: before deleting a category, check
// `await Product.exists({ category: id })` and refuse while products still use it.

export type CategoryData = InferSchemaType<typeof categorySchema>;
export type CategoryDocument = HydratedDocument<CategoryData>;

// Reuse the compiled model across hot reloads (re-compiling a model name throws in development).
const createCategoryModel = () => model("Category", categorySchema);
export const Category = (models.Category as ReturnType<typeof createCategoryModel> | undefined) ?? createCategoryModel();
