import { type HydratedDocument, type InferSchemaType, model, models, Schema } from "mongoose";

import { baseSchemaOptions, integerValidator, koboField } from "./shared";

const productImageSchema = new Schema(
  {
    url: { type: String, required: true },
    // blob pathname, needed to delete the file later
    pathname: { type: String, required: true },
    position: { type: Number, default: 0, validate: integerValidator },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true },
    priceKobo: koboField,
    // shown struck through when higher than the price
    compareAtPriceKobo: { ...koboField, required: false },
    // min 0 so stock can't go negative
    stock: { type: Number, default: 0, min: 0, validate: integerValidator },
    // perfume details
    sizeMl: { type: Number, min: 1, validate: integerValidator },
    concentration: { type: String, trim: true },
    topNotes: { type: [String], default: [] },
    heartNotes: { type: [String], default: [] },
    baseNotes: { type: [String], default: [] },
    isFeatured: { type: Boolean, default: false },
    // products with orders get deactivated, not deleted
    isActive: { type: Boolean, default: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    images: { type: [productImageSchema], default: [] },
  },
  baseSchemaOptions,
);

productSchema.index({ category: 1 });
productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ isActive: 1, priceKobo: 1 });
productSchema.index({ isActive: 1, isFeatured: 1 });
productSchema.index({ name: "text" });

export type ProductData = InferSchemaType<typeof productSchema>;
export type ProductDocument = HydratedDocument<ProductData>;

// avoid OverwriteModelError on hot reload
const createProductModel = () => model("Product", productSchema);
export const Product = (models.Product as ReturnType<typeof createProductModel> | undefined) ?? createProductModel();
