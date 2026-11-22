import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { createMemoryLimiter, type Limiter, RATE_RULES, type RateRuleName } from "./rate-limit-core";

export { clientIp, firstExceeded, RATE_RULES } from "./rate-limit-core";

// Uses Upstash if the env vars are set, otherwise the in-memory limiter.
// If Upstash is down we let the request through rather than block everyone.
function createLimiter(): Limiter {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === "production") {
      console.warn("Rate limiting is using in-memory storage: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.");
    }
    return createMemoryLimiter();
  }

  const redis = new Redis({ url, token });
  const limiters = new Map<RateRuleName, Ratelimit>();
  const limiterFor = (rule: RateRuleName) => {
    let limiter = limiters.get(rule);
    if (!limiter) {
      const { limit, windowSeconds } = RATE_RULES[rule];
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
        prefix: `kamshin:ratelimit:${rule}`,
      });
      limiters.set(rule, limiter);
    }
    return limiter;
  };

  const failOpen = (rule: RateRuleName, error: unknown) => {
    console.error(`Rate limit check failed (${rule}); allowing the request`, error);
    return { success: true, retryAfterSeconds: 0 };
  };
  const secondsUntil = (reset: number) => Math.max(0, Math.ceil((reset - Date.now()) / 1000));

  return {
    async check(rule, key) {
      try {
        const { remaining, reset } = await limiterFor(rule).getRemaining(key);
        return { success: remaining > 0, retryAfterSeconds: remaining > 0 ? 0 : secondsUntil(reset) };
      } catch (error) {
        return failOpen(rule, error);
      }
    },
    async hit(rule, key) {
      try {
        const result = await limiterFor(rule).limit(key);
        return { success: result.success, retryAfterSeconds: result.success ? 0 : secondsUntil(result.reset) };
      } catch (error) {
        return failOpen(rule, error);
      }
    },
  };
}

const globalForLimiter = globalThis as unknown as { kamshinLimiter?: Limiter };
export const rateLimit: Limiter = globalForLimiter.kamshinLimiter ?? createLimiter();
globalForLimiter.kamshinLimiter = rateLimit;
