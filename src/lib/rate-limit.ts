/**
 * In-memory sliding-window rate limiter.
 *
 * For production at scale, replace the Map with Upstash Redis
 * (`@upstash/ratelimit`). The in-memory approach works well for
 * single-instance or preview deployments.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupIfNeeded(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const cutoff = now - windowMs * 2; // extra buffer
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window. */
  maxRequests: number;
  /** Window size in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed. */
  allowed: boolean;
  /** Number of remaining requests in the current window. */
  remaining: number;
  /** Unix timestamp (ms) when the window resets. */
  resetAt: number;
}

/**
 * Check (and consume) a rate limit for the given `key`.
 */
export function rateLimit(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  cleanupIfNeeded(config.windowMs);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= config.maxRequests) {
    // Oldest timestamp in window — that's when the first slot frees up
    const oldestInWindow = entry.timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      resetAt: oldestInWindow + config.windowMs,
    };
  }

  entry.timestamps.push(now);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.timestamps.length,
    resetAt: now + config.windowMs,
  };
}

// ── Pre-configured limiters ────────────────────────────────────────────

/** Agent API routes: 20 requests per minute per user. */
export const AGENT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 20,
  windowMs: 60_000,
};

/** API key management: 30 requests per minute per user. */
export const KEYS_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 30,
  windowMs: 60_000,
};

/** General API routes (notifications, search, share, etc.): 60 requests per minute. */
export const GENERAL_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 60,
  windowMs: 60_000,
};

/** Read-heavy routes (analytics, search): 120 requests per minute. */
export const READ_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 120,
  windowMs: 60_000,
};
