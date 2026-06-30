// Per-user rate limits for community writes. In-memory; resets on
// process restart. Sufficient for a single-process Next.js deployment;
// a multi-process deploy would need Redis or a DB-backed counter.
//
// Limits (per v1 spec §11):
//   - New thread:  1 per 5 minutes per user
//   - New comment: 1 per 30 seconds per user
//   - Reaction:    30 per minute per user
//   - Report:      5 per hour per user
//
// The bucket is a Map<key, { count, windowStartMs }>. On each call we
// either reset the window (if the window has expired) or increment.
// `take` returns true if the action is allowed, false if rate-limited.

type Bucket = { count: number; windowStartMs: number };
const buckets = new Map<string, Bucket>();

interface LimitConfig {
  windowMs: number;
  max: number;
}

const LIMITS: Record<string, LimitConfig> = {
  thread: { windowMs: 5 * 60 * 1000, max: 1 },
  comment: { windowMs: 30 * 1000, max: 1 },
  reaction: { windowMs: 60 * 1000, max: 30 },
  report: { windowMs: 60 * 60 * 1000, max: 5 },
};

export interface RateLimitResult {
  allowed: boolean;
  // ms until the window resets — useful for surfacing a "try again in"
  // hint to the user. 0 when allowed.
  retryAfterMs: number;
  // The current usage in the window (count). For UX ("3 of 5 reports used").
  used: number;
  // The cap. For UX.
  max: number;
}

export function takeRateLimit(kind: keyof typeof LIMITS, userId: string): RateLimitResult {
  const cfg = LIMITS[kind];
  if (!cfg) {
    // Unknown kind — default to allow. Don't ever block on a typo.
    return { allowed: true, retryAfterMs: 0, used: 0, max: 0 };
  }
  const key = `${kind}:${userId}`;
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || now - existing.windowStartMs >= cfg.windowMs) {
    buckets.set(key, { count: 1, windowStartMs: now });
    return { allowed: true, retryAfterMs: 0, used: 1, max: cfg.max };
  }
  if (existing.count >= cfg.max) {
    const retryAfterMs = cfg.windowMs - (now - existing.windowStartMs);
    return { allowed: false, retryAfterMs, used: existing.count, max: cfg.max };
  }
  existing.count += 1;
  return { allowed: true, retryAfterMs: 0, used: existing.count, max: cfg.max };
}

// Reset a user's bucket. Used by the test suite + by mods (when they
// un-suspend a user and we want to give them a clean slate).
export function resetRateLimit(kind: keyof typeof LIMITS, userId: string): void {
  buckets.delete(`${kind}:${userId}`);
}

// Test-only: drop everything.
export function _resetAllRateLimits(): void {
  buckets.clear();
}
