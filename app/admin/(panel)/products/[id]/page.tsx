import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { Button } from "@/components/ui/button";
import { getProductById, listCategories } from "@/lib/catalog";
import { connectDB } from "@/lib/db";
import { Order } from "@/lib/models";
import { storeOrigin } from "@/lib/routing/hosts";
import { requireAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Edit Product" };

export default async function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  const [product, categories] = await Promise.all([getProductById(id), listCategories()]);
  if (!product) notFound();
  // Products that appear in orders can only be deactivated, so order history keeps pointing at them.
  await connectDB();
  const hasOrders = Boolean(await Order.exists({ "items.product": product.id }));

  return (
    <>
      <Link href="/admin/products" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-burgundy">
        <ArrowLeft className="size-4" aria-hidden /> Products
      </Link>
      <AdminPageHeader
        title={product.name}
        description={hasOrders ? "Has orders — can be deactivated but not deleted." : undefined}
        actions={
          <Button asChild variant="outline">
            {/* The store is on another host (STORE_HOST), so this needs its full address. */}
            <a href={`${storeOrigin()}/products/${product.slug}`} target="_blank" rel="noopener">
              View in store <ExternalLink aria-hidden />
            </a>
          </Button>
        }
      />
      <ProductForm product={product} categories={categories} hasOrders={hasOrders} />
    </>
  );
}
