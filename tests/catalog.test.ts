import { describe, expect, it, vi } from "vitest";

import { placeholderArt } from "@/lib/placeholder-art";

// catalog.ts imports server-only, which throws outside Next
vi.mock("server-only", () => ({}));
const { escapeRegex } = await import("@/lib/catalog");

describe("escapeRegex", () => {
  it("makes search text match literally", () => {
    const pattern = new RegExp(escapeRegex("oud (100ml)*"), "i");
    expect(pattern.test("Royal OUD (100ml)* edition")).toBe(true);
    expect(pattern.test("oud 100ml")).toBe(false);
  });

  it("neutralises regex tricks", () => {
    expect(() => new RegExp(escapeRegex("[(*+?"))).not.toThrow();
    expect(new RegExp(escapeRegex(".*")).test("anything")).toBe(false);
  });
});

describe("placeholderArt", () => {
  it("keeps the seeded products' preview look", () => {
    expect(placeholderArt("oud-royale")).toEqual({ tone: "#5A1422", bottle: "classic" });
  });

  it("gives new products a stable colour and shape", () => {
    const a = placeholderArt("brand-new-scent");
    expect(placeholderArt("brand-new-scent")).toEqual(a);
    expect(a.tone).toMatch(/^#[0-9A-F]{6}$/i);
    expect(["classic", "tall", "round"]).toContain(a.bottle);
  });
});
