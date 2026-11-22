import type { Metadata } from "next";

import { CategoriesManager } from "@/components/admin/categories-manager";
import { AdminPageHeader } from "@/components/admin/page-header";
import { countProductsByCategory, listCategories } from "@/lib/catalog";
import { requireAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const [categories, counts] = await Promise.all([listCategories(), countProductsByCategory()]);
  return (
    <>
      <AdminPageHeader title="Categories" description="Collections shown in the store navigation and filters." />
      <CategoriesManager rows={categories.map((c) => ({ ...c, productCount: counts[c.id] ?? 0 }))} />
    </>
  );
}
