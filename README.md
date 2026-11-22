# Kamshin

A Next.js store and admin dashboard for Kamshin perfumes, with MongoDB (Mongoose) as the database.

- **Store** (`kamshin.ng`, locally `localhost:3000`): browse, search and filter fragrances, a shopping bag
  that follows customers across devices, accounts, prices shown in the visitor's local currency.
- **Admin** (`admin.kamshin.ng`, locally `admin.localhost:3000`): products, categories, stock and prices,
  customer accounts and admin access.

> **Status:** checkout, orders and payments are still sample screens. Product photos can be picked in the
> admin form but aren't saved yet. Everything else uses the real database. See
> [`BUILD_SPEC.md`](BUILD_SPEC.md) for how it's put together and what's left.

## Tech stack

Next.js 16 (App Router, Server Actions, `proxy.ts`) · React 19 · TypeScript (strict) · MongoDB Atlas + Mongoose 9 ·
Auth.js v5 (email + password, JWT sessions) · Tailwind CSS 4 + shadcn/ui · Zod · Upstash Redis (rate limiting) ·
Vitest. Hosted on Vercel.

## 1. Set up on your computer

You need **Node.js LTS** (nodejs.org) and **Git** (git-scm.com).

```bash
git clone https://github.com/vandi-25/demo.kamshin-japs
cd demo.kamshin-japs
npm install
cp .env.example .env        # Windows: copy .env.example .env
```

## 2. Create the database (MongoDB Atlas, free)

1. Sign up at **mongodb.com/atlas** and create a **Free (M0)** cluster.
2. **Database Access** → add a database user (password login, *Autogenerate Secure Password*, "Read and write to
   any database").
3. **Network Access** → *Allow access from anywhere* (`0.0.0.0/0`). Vercel has no fixed IP addresses; the database
   is still protected by the user's password.
4. Cluster → **Connect → Drivers** → copy the connection string. Replace `<db_password>` with the password and add
   the database name before the `?`:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/kamshin?retryWrites=true&w=majority`

If `npm run db:seed` fails with `querySrv EBADRESP` (common on Windows), your DNS server can't resolve Atlas
addresses: set your network adapter's DNS to `8.8.8.8` / `1.1.1.1`.

## 3. Environment variables

Put these in `.env` locally and in **Vercel → Project → Settings → Environment Variables** for production.
Never commit `.env` or paste these values anywhere public.

| Variable | Needed for | Notes |
|---|---|---|
| `MONGODB_URI` | everything | Atlas connection string incl. `/kamshin` |
| `AUTH_SECRET` | sign-in | `npx auth secret`. Use a different value in production |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | `npm run db:seed` | The first admin account (password ≥ 8 characters). `SEED_ADMIN_NAME` optional |
| `STORE_HOST`, `ADMIN_HOST` | store/admin split | Include the port locally. Defaults in development: `localhost:3000` / `admin.localhost:3000`. **Required in production**: without `ADMIN_HOST` the admin can't be opened |
| `STORE_URL` | production | Full store address, e.g. `https://kamshin.ng` (used for "View store" links) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | production | Login/signup rate limiting. Without them a per-server in-memory limiter is used (fine locally, weak on Vercel) |
| `EXCHANGE_RATES_URL` | optional | Exchange-rate source for local-currency prices (defaults to open.er-api.com) |

## 4. Load the starting data

```bash
npm run db:seed
```

Creates the first admin, 4 categories and 12 fragrances, and builds every database index. Safe to re-run: it never
overwrites passwords, prices or stock you've changed.

## 5. Run it

```bash
npm run dev
```

- Store: http://localhost:3000
- Admin: http://admin.localhost:3000 (sign in with the seed admin)
- http://localhost:3000/admin shows "not found" on purpose. The admin only opens on its own address.

Chrome, Edge and Firefox send `*.localhost` to your own computer, so no hosts-file changes are needed.

## Everyday tasks

| Task | How |
|---|---|
| Add another admin | They sign up on the store; you open **Admin → Customers → their name → Make admin**. (Or set `SEED_ADMIN_EMAIL` to their email and run `npm run db:seed`.) |
| Remove admin access | **Admin → Customers → their name → Remove admin access**. Takes effect on their next click. You can't change your own role, and the last admin can't be removed |
| Forgotten password | `npm run user:set-password -- someone@example.com` (asks for the new password twice, hidden) |
| Look at the data | Atlas → **Browse Collections** → `kamshin`, or MongoDB Compass with your `MONGODB_URI`. Prices are in kobo (`12800000` = ₦128,000) |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / run it (the build needs no environment variables) |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm test` | Unit tests (Vitest) |
| `npm run db:seed` | Seed data + indexes |
| `npm run user:set-password -- <email>` | Set a new password for any account |

## Security notes

- Every form is re-validated on the server with Zod; every admin page and action re-checks admin access **in the
  database**, so a demoted admin loses access immediately.
- Store and admin sessions are separate (cookies are tied to each address). Passwords are bcrypt-hashed.
- Login: after 5 wrong passwords for one account from one network in 15 minutes (or 30 failures from one network,
  or 20 for one account in an hour), sign-in is paused. Signup: 5 accounts per network per hour. Only failed logins
  count. The limit also covers Auth.js's own sign-in endpoint.
- Shopping bags never store prices; stock and prices are re-checked on every change.

## Deploying to Vercel (checklist)

1. Import the GitHub repo in Vercel (framework: Next.js; build command from `package.json`).
2. **Domains:** add both `kamshin.ng` and `admin.kamshin.ng` to the project.
3. **Environment variables** (Production): `MONGODB_URI`, a new `AUTH_SECRET`, `STORE_HOST=kamshin.ng`,
   `ADMIN_HOST=admin.kamshin.ng`, `STORE_URL=https://kamshin.ng`, `UPSTASH_REDIS_REST_URL`,
   `UPSTASH_REDIS_REST_TOKEN`.
4. **Upstash:** create a free Redis database at upstash.com (or Vercel → Storage → Upstash) and copy its REST URL
   and token.
5. Run `npm run db:seed` once against the production database (with the production `MONGODB_URI` in your local
   `.env`), then sign in at `https://admin.kamshin.ng` and change anything you like.
6. After deploying, check: the store loads, `kamshin.ng/admin` is "not found", the admin login works, and a test
   signup → add to bag → log out → log in keeps the bag.
7. Preview deployments (`*.vercel.app`) are treated as the store; the admin never opens there.

## Known limitations

- **Checkout, orders and payments** are sample screens for now; the admin's revenue and order
  pages are labelled as sample data.
- **Product photos** can be selected in the admin but aren't uploaded or saved; the store shows a drawn bottle.
- A missing or hidden product shows the "not found" page, but with HTTP status 200 (a Next.js streaming trade-off).
- If the database stops responding without refusing connections, pages wait up to about a minute before showing the
  error page; ordinary outages (connection refused, DNS failure) fail within seconds.
