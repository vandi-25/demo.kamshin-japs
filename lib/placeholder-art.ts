import { products as sampleProducts, type BottleShape } from "@/lib/demo/catalog";

// Bottle colour/shape for products without photos. Seeded products keep their colours,
// new ones get one picked from the slug so it's always the same.

const TONES = ["#5A1422", "#8C2F45", "#6B3A1E", "#2E3B2F", "#3B2A4A", "#7A5A1E", "#1F2F3F", "#A0522D"];
const SHAPES: BottleShape[] = ["classic", "tall", "round"];

const bySlug = new Map(sampleProducts.map((p) => [p.slug, { tone: p.tone, bottle: p.bottle }]));

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

export function placeholderArt(slug: string): { tone: string; bottle: BottleShape } {
  const known = bySlug.get(slug);
  if (known) return known;
  const h = hash(slug);
  return { tone: TONES[h % TONES.length]!, bottle: SHAPES[Math.floor(h / TONES.length) % SHAPES.length]! };
}
