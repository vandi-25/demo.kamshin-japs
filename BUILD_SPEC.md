# Kamshin – project notes

Store and admin for Kamshin perfumes in one Next.js app. The store runs on the main domain and the admin
on its own subdomain. Setup and deployment steps are in the [README](README.md); this file covers how
things fit together and what's left to do.

## Stack

| | |
|---|---|
| Framework | Next.js 16.4 (App Router, server actions), React 19, TypeScript strict |
| Routing | `proxy.ts` splits store and admin by hostname |
| Database | MongoDB Atlas with Mongoose 9 (`lib/db.ts`, models in `lib/models`) |
| Auth | Auth.js v5, email + password, JWT sessions, bcryptjs |
| UI | Tailwind 4, shadcn/ui, react-hook-form + Zod |
| Rate limiting | Upstash Redis (in-memory fallback for local dev) |
| Tests | Vitest |
| Hosting | Vercel |

## Rules we stick to

- Money is always integer kobo. Format as naira only when displaying. Other currencies on the store are
  display-only estimates; everything is stored and charged in NGN.
- Every server action and route handler validates its input with Zod and checks auth on the server.
  Client-side validation is just for the user.
- Admin access is checked against the database (`requireAdmin()`), not just the session cookie.
- Only `NEXT_PUBLIC_*` env vars reach the browser.
- `npm run build`, `npm run lint` and `npm test` should pass before merging.

## Store vs admin

- `kamshin.ng` is the store, `admin.kamshin.ng` is the admin. Locally: `localhost:3000` and
  `admin.localhost:3000`.
- `proxy.ts` reads the host (`X-Forwarded-Host` first, then `Host`):
  - Admin host: `/products` is rewritten to `/admin/products` etc. Everything except the login and 403
    pages needs an admin session.
  - Any other host (including Vercel preview URLs) is the store, and `/admin/*` returns 404.
- `STORE_HOST` / `ADMIN_HOST` include the port locally. Without `ADMIN_HOST` in production the admin
  can't be reached at all.
- Cookies are host-only, so store and admin logins are separate.

## Data model

Five collections. Things that are always read together are embedded.

- **User** – name, email (unique), passwordHash (not selected by default), role (`CUSTOMER` / `ADMIN`),
  embedded `addresses[]`.
- **Category** – name, slug (unique), tagline.
- **Product** – name, slug (unique), description, priceKobo, compareAtPriceKobo, stock (≥ 0), perfume
  fields (size, concentration, notes), isFeatured, isActive, category ref, embedded `images[]`.
- **Cart** – user ref (null for guests, unique when set), embedded `items[]` (product + quantity).
  Guest carts expire after 60 days (TTL index).
- **Order** – orderNumber, user ref, status, totals in kobo, Paystack reference, shipping address copy,
  embedded `items[]` with name/price copies.

MongoDB has no foreign keys, so the app enforces these itself:

- A category can't be deleted while products use it.
- A product that appears in an order is deactivated instead of deleted.
- Users with orders shouldn't be deleted.
- Stock changes that involve several documents should use a transaction.

Indexes are defined on the schemas; `npm run db:seed` builds them.

## Main pieces

- **Auth** – `auth.ts`, `lib/auth/*`, `lib/actions/auth.ts`. The admin login form passes `scope: "admin"`
  so non-admins are rejected before a session exists. Unknown emails still run a bcrypt compare so
  timing doesn't reveal which accounts exist.
- **Catalogue** – `lib/catalog.ts`. Store queries only return active products. Search is a
  case-insensitive match on the name.
- **Cart** – `lib/cart/*`, `lib/actions/cart.ts`. Guests are tracked with an httpOnly `cartId` cookie.
  On login the guest cart is merged into the user's cart (quantities added, capped at stock). Prices
  are never stored in the cart; stock is re-checked on every change.
- **Admin** – `lib/actions/admin/*`. Products (create, edit, quick price/stock edit, delete or
  deactivate), categories, and customer roles (can't change your own, can't remove the last admin).
- **Rate limits** – `lib/rate-limit*.ts`, checked inside Auth.js `authorize()` so the Auth.js endpoint
  is covered too. Only failed logins count: 5 per account+IP per 15 min, 30 per IP per 15 min, 20 per
  account per hour. Signup: 5 per IP per hour.
- **Errors** – error boundaries for the store, admin and root; `safeAction()` turns unexpected
  server-action failures into a toast. DB timeouts are set so a dead database shows an error page
  instead of hanging.

## Environment variables

| Variable | Notes |
|---|---|
| `MONGODB_URI` | Atlas connection string, including `/kamshin` |
| `AUTH_SECRET` | `npx auth secret`, different per environment |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | first admin, used by the seed |
| `STORE_HOST` / `ADMIN_HOST` | include the port locally |
| `STORE_URL` | full store URL, used for links from the admin |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | rate limiting in production |
| `EXCHANGE_RATES_URL` | optional, defaults to open.er-api.com |
| `PAYSTACK_SECRET_KEY`, `SHIPPING_FLAT_FEE_KOBO` | for checkout, once it's built |
| `BLOB_READ_WRITE_TOKEN` | for product photos, once uploads are built |

## Status

Done:

- MongoDB models, seed script, password reset script
- Sign up / log in / log out, separate admin login, role checks
- Store/admin split by hostname
- Storefront on real data (search, filters, sort, pagination, product pages)
- Database cart for guests and customers, merged on login
- Admin: products, categories, customers and roles
- Rate limiting, error pages, accessibility fixes (axe reports no issues), README

Not done yet:

- **Checkout, orders and Paystack.** Checkout, "My orders" and the admin order pages still use sample
  data from `lib/demo/orders.ts`. The plan: create a `PENDING` order in a transaction (re-checking stock
  and prices), start the Paystack payment on the server, verify with the webhook (HMAC-SHA512) and on
  the callback page, then mark it `PAID`, reduce stock and clear the cart in one transaction.
- **Product photos.** The admin form has a photo picker but nothing is uploaded yet. The plan is Vercel
  Blob client uploads (admin only, JPEG/PNG/WebP, max 5 MB, resized to 1600px WebP), deleting blobs when
  photos are removed. Until then the store shows the SVG bottle.
- **Dashboard revenue** depends on real orders.

Known issues:

- A missing or hidden product shows the not-found page but with status 200, because
  `products/loading.tsx` starts streaming first. Fixing it needs a lookup in `proxy.ts` or dropping
  that loading screen.
- If the database stops responding without refusing connections, pages can take up to about a minute
  to show the error page.
