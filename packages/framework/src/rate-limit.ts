import rateLimit, { type Store, type Options } from "express-rate-limit"

/**
 * IMPORTANT — multi-instance deployments:
 * These limiters use express-rate-limit's default in-memory store, so counters
 * are PER PROCESS. Behind N processes/pods the effective limit is `max × N`,
 * which weakens brute-force protection. For horizontal scaling, build the
 * limiters with a shared store (e.g. `rate-limit-redis`) via `createRateLimit`
 * and register those in your middlewares.ts instead of the defaults below:
 *
 *   import { RedisStore } from "rate-limit-redis"
 *   const store = new RedisStore({ sendCommand: (...a) => redis.call(...a) })
 *   export const authLimit = createRateLimit({ windowMs: 60_000, max: 10, store })
 */

const sharedOpts = {
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Too many requests" } },
}

/**
 * Builds a rate limiter with the shared defaults. Pass a `store` (e.g. a Redis
 * store) to share counters across processes.
 */
export function createRateLimit(opts: Partial<Options> & { windowMs: number; max: number; store?: Store }) {
  return rateLimit({ ...sharedOpts, ...opts })
}

/**
 * Strict limiter for password-based auth endpoints (login, register).
 * 10 requests per minute per IP — guards against brute-force attacks.
 */
export const authRateLimit = rateLimit({
  windowMs: 60_000,
  max: 10,
  ...sharedOpts,
})

/**
 * Loose limiter for OAuth redirect/callback endpoints.
 * 30 requests per minute per IP — a complete OAuth flow (initiate → callback →
 * exchange) consumes 3 requests, so 30/min allows ~10 flows per minute.
 * OAuth routes are not brute-forceable at the application level because they
 * require a real interaction with the external identity provider and a
 * cryptographic CSRF nonce.
 */
export const oauthRateLimit = rateLimit({
  windowMs: 60_000,
  max: 30,
  ...sharedOpts,
})

/** General API limiter: 300 requests per minute per IP. */
export const apiRateLimit = rateLimit({
  windowMs: 60_000,
  max: 300,
  ...sharedOpts,
})
