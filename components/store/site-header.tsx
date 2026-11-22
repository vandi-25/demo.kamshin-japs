import Link from "next/link";
import { LogOut, Search, ShoppingBag, User } from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { CartCount } from "@/components/cart/cart-count";
import { logoutAction } from "@/lib/actions/auth";
import { getSessionUser } from "@/lib/auth/guards";
import { getCartCount } from "@/lib/cart/store";

import { CurrencySwitcher } from "./currency-switcher";
import { MobileNav } from "./mobile-nav";
import { storeNav } from "./nav-links";

const iconLink =
  "relative grid size-10 place-items-center rounded-md text-foreground transition-colors hover:bg-accent hover:text-burgundy focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

export async function SiteHeader() {
  const user = await getSessionUser();
  // The badge is nice-to-have: if the database hiccups, show an empty badge instead of failing every page.
  const cartCount = await getCartCount({ userId: user?.id ?? null }).catch((error: unknown) => {
    console.error("Couldn't load the bag count", error);
    return 0;
  });
  const firstName = user?.name.split(" ")[0] || "Account";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6 lg:h-20">
        <div className="flex items-center gap-1">
          <MobileNav user={user ? { name: user.name, email: user.email } : null} />
          <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
            {storeNav.slice(0, 3).map((item) => (
              <Link key={item.href} href={item.href} className="text-xs tracking-[0.16em] uppercase hover:text-burgundy">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <Link href="/" aria-label="Kamshin home" className="rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
          <Wordmark className="text-xl lg:text-2xl" />
        </Link>

        <div className="flex items-center justify-end gap-1">
          <nav aria-label="Collections" className="mr-4 hidden items-center gap-7 xl:flex">
            {storeNav.slice(3).map((item) => (
              <Link key={item.href} href={item.href} className="text-xs tracking-[0.16em] uppercase hover:text-burgundy">
                {item.label}
              </Link>
            ))}
          </nav>
          <CurrencySwitcher className="mr-1 hidden sm:block" />
          <Link href="/products" className={iconLink} aria-label="Search fragrances">
            <Search className="size-5" />
          </Link>
          {user ? (
            <>
              <Link
                href="/account/orders"
                className="mr-1 hidden items-center gap-2 rounded-md px-2 py-2 text-xs tracking-[0.12em] uppercase hover:text-burgundy focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sm:flex"
                aria-label={`My account (${user.name})`}
              >
                <User className="size-5" aria-hidden />
                <span className="hidden max-w-28 truncate md:inline">{firstName}</span>
              </Link>
              <form action={logoutAction} className="hidden sm:block">
                <button type="submit" className={iconLink} aria-label="Log out">
                  <LogOut className="size-5" aria-hidden />
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className={`${iconLink} hidden sm:grid`} aria-label="Sign in">
              <User className="size-5" />
            </Link>
          )}
          <Link href="/cart" className={iconLink}>
            <ShoppingBag className="size-5" aria-hidden />
            <CartCount count={cartCount} />
          </Link>
        </div>
      </div>
    </header>
  );
}
