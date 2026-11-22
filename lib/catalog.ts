import "server-only";

import { isValidObjectId, type Types } from "mongoose";
import { cache } from "react";

import type { BottleShape } from "@/lib/demo/catalog";
import { connectDB } from "@/lib/db";
import { Category as CategoryModel, Product as ProductModel } from "@/lib/models";
import { placeholderArt } from "@/lib/placeholder-art";

// Product/category queries. Returns plain objects so they can go straight to client components.
// Store queries only return active products; admin passes includeInactive.

export type Category = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
};

export type ProductImage = { url: string; pathname: string; position: number };

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceKobo: number;
  compareAtPriceKobo: number | null;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  categoryId: string;
  sizeMl: number;
  concentration: string;
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
  images: ProductImage[];
  // placeholder bottle, worked out from the slug
  tone: string;
  bottle: BottleShape;
  createdAt: string;
};

export type SortOption = "newest" | "price-asc" | "price-desc";

export type ProductQuery = {
  q?: string;
  // category slug
  category?: string;
  minKobo?: number;
  maxKobo?: number;
  sort?: SortOption;
  page?: number;
  perPage?: number;
  includeInactive?: boolean;
};

export type ProductPage = {
  items: Product[];
  total: number;
  page: number;
  pageCount: number;
};


type CategoryDoc = { _id: Types.ObjectId; name: string; slug: string; tagline?: string | null };

type ProductDoc = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description: string;
  priceKobo: number;
  compareAtPriceKobo?: number | null;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  category?: Types.ObjectId | null;
  sizeMl?: number | null;
  concentration?: string | null;
  topNotes: string[];
  heartNotes: string[];
  baseNotes: string[];
  images: { url: string; pathname: string; position: number }[];
  createdAt: Date;
};

const PRODUCT_FIELDS =
  "name slug description priceKobo compareAtPriceKobo stock isActive isFeatured category sizeMl concentration topNotes heartNotes baseNotes images createdAt";

function toCategory(doc: CategoryDoc): Category {
  return { id: String(doc._id), name: doc.name, slug: doc.slug, tagline: doc.tagline ?? "" };
}

function toProduct(doc: ProductDoc): Product {
  return {
    id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    priceKobo: doc.priceKobo,
    compareAtPriceKobo: doc.compareAtPriceKobo ?? null,
    stock: doc.stock,
    isActive: doc.isActive,
    isFeatured: doc.isFeatured,
    categoryId: doc.category ? String(doc.category) : "",
    sizeMl: doc.sizeMl ?? 0,
    concentration: doc.concentration ?? "",
    topNotes: [...doc.topNotes],
    heartNotes: [...doc.heartNotes],
    baseNotes: [...doc.baseNotes],
    images: [...doc.images]
      .sort((a, b) => a.position - b.position)
      .map(({ url, pathname, position }) => ({ url, pathname, position })),
    ...placeholderArt(doc.slug),
    createdAt: new Date(doc.createdAt).toISOString(),
  };
}

export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SORTS: Record<SortOption, Record<string, 1 | -1>> = {
  // _id as tie-breaker so pages don't overlap
  newest: { createdAt: -1, _id: -1 },
  "price-asc": { priceKobo: 1, _id: 1 },
  "price-desc": { priceKobo: -1, _id: -1 },
};


export const listCategories = cache(async (): Promise<Category[]> => {
  await connectDB();
  // keep the seed order (For Her, For Him, Unisex, Oud)
  const docs = await CategoryModel.find().sort({ createdAt: 1, _id: 1 }).lean<CategoryDoc[]>();
  return docs.map(toCategory);
});

export const getCategoryBySlug = cache(async (slug: string): Promise<Category | null> => {
  await connectDB();
  const doc = await CategoryModel.findOne({ slug }).lean<CategoryDoc>();
  return doc ? toCategory(doc) : null;
});

export const getCategory = cache(async (id: string): Promise<Category | null> => {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  const doc = await CategoryModel.findById(id).lean<CategoryDoc>();
  return doc ? toCategory(doc) : null;
});

export async function countProductsByCategory({ activeOnly = false } = {}): Promise<Record<string, number>> {
  await connectDB();
  const rows = await ProductModel.aggregate<{ _id: Types.ObjectId | null; count: number }>([
    { $match: activeOnly ? { isActive: true } : {} },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  const counts: Record<string, number> = {};
  for (const row of rows) if (row._id) counts[String(row._id)] = row.count;
  return counts;
}


export async function listProducts(query: ProductQuery = {}): Promise<ProductPage> {
  const perPage = Math.min(Math.max(1, query.perPage ?? 9), 100);
  await connectDB();

  const filter: Record<string, unknown> = {};
  if (!query.includeInactive) filter.isActive = true;

  const q = query.q?.trim().slice(0, 80);
  if (q) filter.name = { $regex: escapeRegex(q), $options: "i" };

  if (query.category) {
    const category = await getCategoryBySlug(query.category);
    if (!category) return { items: [], total: 0, page: 1, pageCount: 1 };
    filter.category = category.id;
  }

  const price: Record<string, number> = {};
  if (query.minKobo !== undefined) price.$gte = query.minKobo;
  if (query.maxKobo !== undefined) price.$lte = query.maxKobo;
  if (Object.keys(price).length > 0) filter.priceKobo = price;

  const total = await ProductModel.countDocuments(filter);
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(Math.max(1, query.page ?? 1), pageCount);

  const docs = await ProductModel.find(filter)
    .select(PRODUCT_FIELDS)
    .sort(SORTS[query.sort ?? "newest"])
    .skip((page - 1) * perPage)
    .limit(perPage)
    .lean<ProductDoc[]>();

  return { items: docs.map(toProduct), total, page, pageCount };
}

// cache() so generateMetadata and the page share one query
export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  await connectDB();
  const doc = await ProductModel.findOne({ slug, isActive: true }).select(PRODUCT_FIELDS).lean<ProductDoc>();
  return doc ? toProduct(doc) : null;
});

// admin - includes hidden products
export async function getProductById(id: string): Promise<Product | null> {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  const doc = await ProductModel.findById(id).select(PRODUCT_FIELDS).lean<ProductDoc>();
  return doc ? toProduct(doc) : null;
}

export async function listFeaturedProducts(limit = 4): Promise<Product[]> {
  await connectDB();
  const docs = await ProductModel.find({ isActive: true, isFeatured: true })
    .select(PRODUCT_FIELDS)
    .sort(SORTS.newest)
    .limit(limit)
    .lean<ProductDoc[]>();
  return docs.map(toProduct);
}

// skip featured ones so the two home sections don't repeat
export async function listNewArrivals(limit = 4): Promise<Product[]> {
  await connectDB();
  const docs = await ProductModel.find({ isActive: true, isFeatured: false })
    .select(PRODUCT_FIELDS)
    .sort(SORTS.newest)
    .limit(limit)
    .lean<ProductDoc[]>();
  return docs.map(toProduct);
}

export async function listRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  if (!product.categoryId) return [];
  await connectDB();
  const docs = await ProductModel.find({ isActive: true, category: product.categoryId, _id: { $ne: product.id } })
    .select(PRODUCT_FIELDS)
    .sort(SORTS.newest)
    .limit(limit)
    .lean<ProductDoc[]>();
  return docs.map(toProduct);
}

export async function listLowStock(threshold = 10): Promise<Product[]> {
  await connectDB();
  const docs = await ProductModel.find({ stock: { $lte: threshold } })
    .select(PRODUCT_FIELDS)
    .sort({ stock: 1, name: 1 })
    .lean<ProductDoc[]>();
  return docs.map(toProduct);
}
