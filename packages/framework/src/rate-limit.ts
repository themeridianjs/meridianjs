import rateLimit from "express-rate-limit"

const sharedOpts = {
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "Too many requests" } },
}

/** Strict limiter for auth endpoints: 10 requests per minute per IP. */
export const authRateLimit = rateLimit({
  windowMs: 60_000,
  max: 10,
  ...sharedOpts,
})

/** General API limiter: 300 requests per minute per IP. */
export const apiRateLimit = rateLimit({
  windowMs: 60_000,
  max: 300,
  ...sharedOpts,
})
