"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, LogOut, Menu } from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { adminLogoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

import { adminNav } from "./nav";

export type AdminIdentity = { name: string; email: string };

// the store is on a different host
type ShellProps = { admin: AdminIdentity; storeUrl: string };

function initials(name: string) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase());
  return letters.join("") || "A";
}

function NavLinks({ admin, storeUrl, onNavigate }: ShellProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <nav aria-label="Admin" className="flex flex-col gap-1">
        {adminNav.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors focus-visible:ring-[3px] focus-visible:ring-sidebar-ring/60 focus-visible:outline-none",
                active
                  ? "bg-sidebar-primary font-medium text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-sidebar-border pt-4 pb-2">
        <a
          href={storeUrl}
          target="_blank"
          rel="noopener"
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-sidebar-foreground/85 hover:bg-sidebar-accent"
        >
          <ExternalLink className="size-4" aria-hidden /> View store
        </a>
        <form action={adminLogoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-sidebar-foreground/85 hover:bg-sidebar-accent"
          >
            <LogOut className="size-4" aria-hidden /> Log out
          </button>
        </form>
        <div className="mt-3 flex min-w-0 items-center gap-3 px-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
            {initials(admin.name)}
          </span>
          <span className="min-w-0 text-xs leading-tight">
            <span className="block truncate text-sidebar-foreground">{admin.name}</span>
            <span className="block truncate text-sidebar-foreground/60">{admin.email}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function AdminSidebar({ admin, storeUrl }: ShellProps) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto bg-sidebar p-5 text-sidebar-foreground lg:flex">
      <Link href="/admin" className="mb-8 shrink-0 px-3">
        <Wordmark tone="ivory" className="text-xl" />
        <span className="mt-1 block text-[10px] tracking-[0.3em] text-sidebar-primary uppercase">Admin</span>
      </Link>
      <NavLinks admin={admin} storeUrl={storeUrl} />
    </aside>
  );
}

export function AdminMobileBar({ admin, storeUrl }: ShellProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-between bg-sidebar px-4 py-3 text-sidebar-foreground lg:hidden">
      <Link href="/admin">
        <Wordmark tone="ivory" className="text-lg" />
      </Link>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-white" aria-label="Open admin menu">
            <Menu className="size-5" />
          </Button>
        </DialogTrigger>
        <DialogContent side="left" aria-describedby={undefined} className="border-sidebar-border bg-sidebar text-sidebar-foreground">
          <DialogTitle className="sr-only">Admin menu</DialogTitle>
          <div className="mb-8 px-3">
            <Wordmark tone="ivory" className="text-xl" />
          </div>
          <div className="h-[calc(100%-5rem)]">
            <NavLinks admin={admin} storeUrl={storeUrl} onNavigate={() => setOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
