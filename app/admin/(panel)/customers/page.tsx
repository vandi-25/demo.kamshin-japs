import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { z } from "zod";

import { Table, Td, Th } from "@/components/admin/data-table";
import { AdminPageHeader } from "@/components/admin/page-header";
import { RoleBadge } from "@/components/admin/role-control";
import { Pagination } from "@/components/store/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listCustomers } from "@/lib/admin/customers";
import { requireAdmin } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { formatNaira } from "@/lib/money";

export const metadata: Metadata = { title: "Customers" };

const one = (v: unknown) => (Array.isArray(v) ? v[0] : v);
const paramsSchema = z.object({
  q: z.preprocess(one, z.string().trim().max(80).optional()).catch(undefined),
  page: z.preprocess(one, z.coerce.number().int().min(1).max(10_000).optional()).catch(undefined),
});

export default async function AdminCustomersPage(props: PageProps<"/admin/customers">) {
  await requireAdmin();
  const { q, page } = paramsSchema.parse(await props.searchParams);
  const result = await listCustomers({ q, page });

  return (
    <>
      <AdminPageHeader
        title="Customers"
        description={`${result.total} ${result.total === 1 ? "account" : "accounts"} · open one to see orders or change their role`}
      />
      <form action="/admin/customers" className="mb-4 flex max-w-md gap-2" role="search">
        <label htmlFor="q" className="sr-only">Search customers</label>
        <Input id="q" name="q" type="search" defaultValue={q} placeholder="Search by name or email" />
        <Button type="submit" variant="outline"><Search aria-hidden /> Search</Button>
      </form>
      {result.items.length === 0 ? (
        <div className="rounded-md border border-dashed bg-card px-6 py-16 text-center">
          <p className="font-medium">{q ? `No accounts match “${q}”` : "No accounts yet"}</p>
          {q && <Link href="/admin/customers" className="mt-2 inline-block text-sm text-burgundy hover:underline">Clear search</Link>}
        </div>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Joined</Th>
              <Th className="text-right">Orders</Th>
              <Th className="text-right">Total spent</Th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((c) => (
              <tr key={c.id} className="hover:bg-muted/40">
                <Td>
                  <Link href={`/admin/customers/${c.id}`} className="font-medium text-burgundy hover:underline">{c.name}</Link>
                </Td>
                <Td className="text-muted-foreground">{c.email}</Td>
                <Td><RoleBadge role={c.role} /></Td>
                <Td className="text-muted-foreground">{formatDate(c.createdAt)}</Td>
                <Td className="text-right tabular-nums">{c.orderCount}</Td>
                <Td className="text-right tabular-nums">{formatNaira(c.spentKobo)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        hrefFor={(n) => {
          const sp = new URLSearchParams();
          if (q) sp.set("q", q);
          if (n > 1) sp.set("page", String(n));
          const s = sp.toString();
          return s ? `/admin/customers?${s}` : "/admin/customers";
        }}
      />
    </>
  );
}
