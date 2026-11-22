import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { listCategories } from "@/lib/catalog";
import { requireAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Add Product" };

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await listCategories();
  return (
    <>
      <AdminPageHeader title="Add product" description="New fragrances are visible in the store as soon as they're active." />
      <ProductForm categories={categories} />
    </>
  );
}
