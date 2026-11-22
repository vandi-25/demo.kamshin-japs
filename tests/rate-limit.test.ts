import { describe, expect, it } from "vitest";

import { clientIp, createMemoryLimiter, firstExceeded, RATE_RULES } from "@/lib/rate-limit-core";

describe("createMemoryLimiter", () => {
  it("allows up to the limit, then blocks with a retry time", async () => {
    const limit = createMemoryLimiter(() => 0);
    const { limit: max, windowSeconds } = RATE_RULES.loginPerAccountAndIp;
    for (let i = 0; i < max; i++) expect((await limit.hit("loginPerAccountAndIp", "a|1")).success).toBe(true);
    const blocked = await limit.hit("loginPerAccountAndIp", "a|1");
    expect(blocked.success).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(windowSeconds);
  });

  it("slides: attempts older than the window stop counting", async () => {
    let t = 0;
    const limit = createMemoryLimiter(() => t);
    const { limit: max, windowSeconds } = RATE_RULES.signupPerIp;
    for (let i = 0; i < max; i++) await limit.hit("signupPerIp", "ip");
    expect((await limit.hit("signupPerIp", "ip")).success).toBe(false);
    t += windowSeconds * 1000;
    expect((await limit.hit("signupPerIp", "ip")).success).toBe(true);
  });

  it("check looks without counting", async () => {
    const limit = createMemoryLimiter(() => 0);
    for (let i = 0; i < 50; i++) expect((await limit.check("signupPerIp", "ip")).success).toBe(true);
    for (let i = 0; i < RATE_RULES.signupPerIp.limit; i++) await limit.hit("signupPerIp", "ip");
    expect((await limit.check("signupPerIp", "ip")).success).toBe(false);
  });

  it("keeps keys and rules separate", async () => {
    const limit = createMemoryLimiter(() => 0);
    for (let i = 0; i < RATE_RULES.signupPerIp.limit; i++) await limit.hit("signupPerIp", "ip-a");
    expect((await limit.hit("signupPerIp", "ip-b")).success).toBe(true);
    expect((await limit.hit("loginPerIp", "ip-a")).success).toBe(true);
  });

  it("bounds memory", async () => {
    const limit = createMemoryLimiter(() => 0, 3);
    for (const k of ["a", "b", "c", "d", "e"]) await limit.hit("loginPerIp", k);
    // "a" got evicted
    expect((await limit.hit("loginPerIp", "a")).success).toBe(true);
  });
});

describe("firstExceeded", () => {
  it("returns the first rule over its limit", async () => {
    const limiter = { check: async (rule: keyof typeof RATE_RULES) => ({ success: rule !== "loginPerAccount", retryAfterSeconds: 9 }) };
    expect(await firstExceeded(limiter, [["loginPerIp", "x"], ["loginPerAccount", "y"]])).toEqual({
      success: false,
      retryAfterSeconds: 9,
      rule: "loginPerAccount",
    });
    expect(await firstExceeded(limiter, [["loginPerIp", "x"]])).toBeNull();
  });
});

describe("clientIp", () => {
  const h = (e: Record<string, string>) => new Headers(e);
  it("prefers x-real-ip, then the first x-forwarded-for entry", () => {
    expect(clientIp(h({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" }))).toBe("1.1.1.1");
    expect(clientIp(h({ "x-forwarded-for": "3.3.3.3, 10.0.0.1" }))).toBe("3.3.3.3");
    expect(clientIp(h({}))).toBe("unknown");
  });
});
