/**
 * Security-focused tests for the rate limiter.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, type RateLimitConfig } from "@/lib/rate-limit";

describe("rateLimit", () => {
  const config: RateLimitConfig = {
    maxRequests: 3,
    windowMs: 1000, // 1 second window for fast tests
  };

  // Use a unique key prefix per test to avoid cross-contamination
  let keyPrefix: string;
  beforeEach(() => {
    keyPrefix = `test-${Date.now()}-${Math.random()}`;
  });

  it("allows requests up to the limit", () => {
    const key = `${keyPrefix}:a`;

    const r1 = rateLimit(key, config);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = rateLimit(key, config);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = rateLimit(key, config);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests over the limit", () => {
    const key = `${keyPrefix}:b`;

    rateLimit(key, config);
    rateLimit(key, config);
    rateLimit(key, config);

    const r4 = rateLimit(key, config);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.resetAt).toBeGreaterThan(Date.now());
  });

  it("allows requests again after the window expires", async () => {
    const shortConfig: RateLimitConfig = {
      maxRequests: 1,
      windowMs: 50, // 50ms window
    };
    const key = `${keyPrefix}:c`;

    const r1 = rateLimit(key, shortConfig);
    expect(r1.allowed).toBe(true);

    const r2 = rateLimit(key, shortConfig);
    expect(r2.allowed).toBe(false);

    // Wait for the window to expire
    await new Promise((resolve) => setTimeout(resolve, 60));

    const r3 = rateLimit(key, shortConfig);
    expect(r3.allowed).toBe(true);
  });

  it("tracks different keys independently", () => {
    const keyA = `${keyPrefix}:user1`;
    const keyB = `${keyPrefix}:user2`;
    const singleConfig: RateLimitConfig = { maxRequests: 1, windowMs: 5000 };

    rateLimit(keyA, singleConfig);
    const rA = rateLimit(keyA, singleConfig);
    expect(rA.allowed).toBe(false);

    // Different key should still be allowed
    const rB = rateLimit(keyB, singleConfig);
    expect(rB.allowed).toBe(true);
  });
});
