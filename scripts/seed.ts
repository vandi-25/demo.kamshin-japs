// Seeds the first admin plus the demo catalogue. Safe to run again - it never
// overwrites passwords, prices or stock that were changed.
// Usage: npm run db:seed
import "dotenv/config";

import mongoose from "mongoose";
import { z } from "zod";

import { categories, products } from "../lib/demo/catalog";
import { Cart, Category, Order, Product, User } from "../lib/models";
import { hashPassword, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../lib/password";

const envSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  SEED_ADMIN_EMAIL: z.string().trim().pipe(z.email("SEED_ADMIN_EMAIL must be a valid email")),
  SEED_ADMIN_PASSWORD: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `SEED_ADMIN_PASSWORD must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .max(PASSWORD_MAX_LENGTH, `SEED_ADMIN_PASSWORD must be at most ${PASSWORD_MAX_LENGTH} characters`),
  SEED_ADMIN_NAME: z.string().min(1).default("Store Admin"),
});

const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
  console.error("Seed aborted — fix these .env values:");
  for (const issue of parsedEnv.error.issues) console.error(`  • ${issue.path.join(".")}: ${issue.message}`);
  process.exit(1);
}
const env = parsedEnv.data;

async function main() {
  await mongoose.connect(env.MONGODB_URI);

  // build indexes first (also drops ones we no longer use)
  await Promise.all([User, Category, Product, Cart, Order].map((model) => model.syncIndexes()));

  // admin
  const email = env.SEED_ADMIN_EMAIL.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    // keep their password, just make sure they're an admin
    if (existing.role !== "ADMIN") {
      existing.role = "ADMIN";
      await existing.save();
      console.log(`✔ Promoted existing user ${email} to ADMIN (password unchanged)`);
    } else {
      console.log(`✔ Admin ${email} already exists (password unchanged)`);
    }
  } else {
    await User.create({
      name: env.SEED_ADMIN_NAME,
      email,
      passwordHash: await hashPassword(env.SEED_ADMIN_PASSWORD),
      role: "ADMIN",
    });
    console.log(`✔ Created admin ${email}`);
  }

  // categories
  const categoryIds = new Map<string, mongoose.Types.ObjectId>();
  for (const c of categories) {
    const row = await Category.findOneAndUpdate(
      { slug: c.slug },
      { $setOnInsert: { name: c.name, slug: c.slug, tagline: c.tagline } },
      { upsert: true, returnDocument: "after" },
    );
    if (!row) throw new Error(`Could not save category ${c.slug}`);
    categoryIds.set(c.id, row._id);
  }
  console.log(`✔ ${categories.length} categories`);

  // products
  for (const p of products) {
    const category = categoryIds.get(p.categoryId);
    if (!category) throw new Error(`Unknown category ${p.categoryId} for ${p.name}`);
    // $setOnInsert so we don't clobber admin edits
    await Product.updateOne(
      { slug: p.slug },
      {
        $setOnInsert: {
          name: p.name,
          slug: p.slug,
          description: p.description,
          priceKobo: p.priceKobo,
          compareAtPriceKobo: p.compareAtPriceKobo,
          stock: p.stock,
          isActive: p.isActive,
          isFeatured: p.isFeatured,
          sizeMl: p.sizeMl,
          concentration: p.concentration,
          topNotes: p.topNotes,
          heartNotes: p.heartNotes,
          baseNotes: p.baseNotes,
          category,
        },
      },
      { upsert: true, runValidators: true },
    );
  }
  console.log(`✔ ${products.length} products`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
