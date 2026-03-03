import rateLimit from "express-rate-limit"

const sharedOpts = {
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Too many requests" } },
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
