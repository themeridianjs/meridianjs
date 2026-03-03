/**
 * In-memory one-time code store for the Google OAuth callback.
 *
 * After a successful OAuth flow, the backend issues a short-lived one-time code
 * (instead of putting the JWT directly in the redirect URL where it would appear
 * in server access logs). The frontend exchanges this code for the real JWT via
 * POST /auth/google/exchange within a 2-minute window.
 *
 * Module-level singleton — shared between the callback and exchange routes
 * because Node.js caches module instances.
 */

interface ExchangeEntry {
  token: string
  expiresAt: number
}

const store = new Map<string, ExchangeEntry>()

/** Store a one-time code mapped to a JWT. TTL: 2 minutes. */
export function storeExchangeCode(code: string, token: string): void {
  store.set(code, { token, expiresAt: Date.now() + 2 * 60 * 1000 })
}

/**
 * Consume a one-time code and return the associated JWT.
 * The code is deleted immediately — it cannot be reused.
 * Returns null if the code is invalid or expired.
 */
export function consumeExchangeCode(code: string): string | null {
  const entry = store.get(code)
  store.delete(code) // always delete — single use
  if (!entry || entry.expiresAt < Date.now()) return null
  return entry.token
}
