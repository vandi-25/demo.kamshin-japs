// Rate limit rules + in-memory limiter. Kept free of server-only imports for the tests.

export type RateRule = { limit: number; windowSeconds: number };

export const RATE_RULES = {
  loginPerAccountAndIp: { limit: 5, windowSeconds: 15 * 60 },
  loginPerIp: { limit: 30, windowSeconds: 15 * 60 },
  loginPerAccount: { limit: 20, windowSeconds: 60 * 60 },
  signupPerIp: { limit: 5, windowSeconds: 60 * 60 },
} satisfies Record<string, RateRule>;

export type RateRuleName = keyof typeof RATE_RULES;

export type LimitResult = { success: boolean; retryAfterSeconds: number };

// check() just looks, hit() records an attempt. Login only hits on a wrong password.
export type Limiter = {
  check: (rule: RateRuleName, key: string) => Promise<LimitResult>;
  hit: (rule: RateRuleName, key: string) => Promise<LimitResult>;
};

// Fallback for local dev. Per-instance on Vercel, so use Upstash in production.
export function createMemoryLimiter(now: () => number = Date.now, maxKeys = 10_000): Limiter {
  const hits = new Map<string, number[]>();

  const recentFor = (rule: RateRuleName, key: string) => {
    const windowMs = RATE_RULES[rule].windowSeconds * 1000;
    const t = now();
    const id = `${rule}:${key}`;
    const recent = (hits.get(id) ?? []).filter((at) => t - at < windowMs);
    hits.set(id, recent);
    return { id, recent, t, windowMs };
  };

  const blocked = (recent: number[], t: number, windowMs: number): LimitResult => {
    const oldest = recent[0] ?? t;
    return { success: false, retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - t) / 1000)) };
  };

  return {
    async check(rule, key) {
      const { recent, t, windowMs } = recentFor(rule, key);
      return recent.length >= RATE_RULES[rule].limit ? blocked(recent, t, windowMs) : { success: true, retryAfterSeconds: 0 };
    },
    async hit(rule, key) {
      const { recent, t, windowMs } = recentFor(rule, key);
      if (recent.length >= RATE_RULES[rule].limit) return blocked(recent, t, windowMs);
      recent.push(t);
      // cap memory use
      if (hits.size > maxKeys) {
        for (const k of hits.keys()) {
          hits.delete(k);
          if (hits.size <= maxKeys) break;
        }
      }
      return { success: true, retryAfterSeconds: 0 };
    },
  };
}

export async function firstExceeded(
  limiter: Pick<Limiter, "check">,
  checks: [RateRuleName, string][],
): Promise<(LimitResult & { rule: RateRuleName }) | null> {
  for (const [rule, key] of checks) {
    const result = await limiter.check(rule, key);
    if (!result.success) return { ...result, rule };
  }
  return null;
}

// Vercel sets these headers. Self-hosted without a proxy they can be spoofed,
// which is why there are per-account limits as well.
export function clientIp(headers: { get(name: string): string | null }): string {
  const real = headers.get("x-real-ip")?.trim();
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (real || forwarded || "unknown").slice(0, 64);
}
