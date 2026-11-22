import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Table, Td, Th } from "@/components/admin/data-table";
import { RoleControl } from "@/components/admin/role-control";
import { StatTile } from "@/components/admin/stat-tile";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { getCustomer } from "@/lib/admin/customers";
import { requireAdmin } from "@/lib/auth/guards";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatNaira } from "@/lib/money";

export const metadata: Metadata = { title: "Customer" };

export default async function AdminCustomerPage(props: PageProps<"/admin/customers/[id]">) {
  const admin = await requireAdmin();
  const { id } = await props.params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  return (
    <>
      <Link href="/admin/customers" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-burgundy">
        <ArrowLeft className="size-4" aria-hidden /> Customers
      </Link>
      <h1 className="text-4xl text-burgundy">{customer.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {customer.email}
        {customer.phone && <> · {customer.phone}</>} · joined {formatDate(customer.createdAt)}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatTile label="Orders" value={String(customer.orders.length)} />
            <StatTile label="Total spent" value={formatNaira(customer.spentKobo)} note="Paid orders only" />
          </div>
          <section aria-labelledby="orders-h">
            <h2 id="orders-h" className="mb-3 font-sans text-base font-medium tracking-normal">Orders</h2>
            {customer.orders.length === 0 ? (
              <p className="rounded-md border border-dashed bg-card px-6 py-10 text-center text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Order</Th>
                    <Th>Placed</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/40">
                      <Td><Link href={`/admin/orders/${o.id}`} className="font-medium text-burgundy hover:underline">{o.orderNumber}</Link></Td>
                      <Td className="text-muted-foreground">{formatDateTime(o.createdAt)}</Td>
                      <Td><OrderStatusBadge status={o.status} /></Td>
                      <Td className="text-right tabular-nums">{formatNaira(o.totalKobo)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </section>
        </div>
        <section aria-labelledby="access-h" className="h-fit rounded-md border bg-card p-5">
          <h2 id="access-h" className="mb-4 font-sans text-base font-medium tracking-normal">Access</h2>
          <RoleControl userId={customer.id} name={customer.name} role={customer.role} isSelf={customer.id === admin.id} />
        </section>
      </div>
    </>
  );
}
