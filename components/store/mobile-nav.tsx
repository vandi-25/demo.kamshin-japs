"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions/auth";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { CurrencySwitcher } from "./currency-switcher";
import { storeNav } from "./nav-links";

export function MobileNav({ user }: { user: { name: string; email: string } | null }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent side="left" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Menu</DialogTitle>
        <Wordmark className="text-xl" />
        <nav aria-label="Mobile" className="mt-10 flex flex-col">
          {storeNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="border-b py-4 font-serif text-2xl text-foreground hover:text-burgundy"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 flex flex-col gap-3 text-sm">
          {user ? (
            <>
              <p className="text-muted-foreground">
                Signed in as <span className="text-foreground">{user.name}</span>
              </p>
              <Link href="/account/orders" onClick={() => setOpen(false)} className="hover:text-burgundy">
                My orders
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="hover:text-burgundy">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setOpen(false)} className="hover:text-burgundy">
                Sign in
              </Link>
              <Link href="/signup" onClick={() => setOpen(false)} className="hover:text-burgundy">
                Create account
              </Link>
            </>
          )}
        </div>
        <div className="mt-8 flex items-center justify-between text-sm sm:hidden">
          <span className="text-muted-foreground">Currency</span>
          <CurrencySwitcher />
        </div>
      </DialogContent>
    </Dialog>
  );
}
