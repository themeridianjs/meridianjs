/**
 * In-memory OTP store for registration email verification flow.
 *
 * One active OTP per email address. 6-digit numeric code, 10-minute TTL.
 * Rate-limited: rejects re-sends within 60 seconds.
 *
 * Uses globalThis to guarantee a single shared Map even when route files
 * are loaded via separate dynamic import() calls by the route scanner.
 */

import { randomInt } from "crypto"

interface OtpEntry {
  otp: string
  expiresAt: number
  sentAt: number
  attempts: number
}

const STORE_KEY = "__meridian_registration_otp_store__"
const OTP_TTL_MS = 10 * 60 * 1000  // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000 // 60 seconds
const MAX_ATTEMPTS = 5

function getStore(): Map<string, OtpEntry> {
  if (!(globalThis as any)[STORE_KEY]) {
    ;(globalThis as any)[STORE_KEY] = new Map<string, OtpEntry>()
  }
  return (globalThis as any)[STORE_KEY]
}

/** Generate and store a 6-digit OTP for an email address. Throws if rate-limited. */
export function generateAndStoreOtp(email: string): string {
  const store = getStore()
  const existing = store.get(email)
  if (existing && Date.now() - existing.sentAt < RESEND_COOLDOWN_MS) {
    throw Object.assign(new Error("Please wait before requesting a new code"), { status: 429 })
  }

  const otp = String(randomInt(100000, 999999))
  store.set(email, { otp, expiresAt: Date.now() + OTP_TTL_MS, sentAt: Date.now(), attempts: 0 })
  return otp
}

/**
 * Consume an OTP. Returns true if the code matches and is not expired.
 * Tracks failed attempts — after MAX_ATTEMPTS failures the entry is invalidated.
 * On success the entry is deleted (single-use).
 */
export function consumeOtp(email: string, otp: string): boolean {
  const store = getStore()
  const entry = store.get(email)
  if (!entry || entry.expiresAt < Date.now()) {
    store.delete(email)
    return false
  }
  if (entry.otp === otp) {
    store.delete(email)
    return true
  }
  // Wrong code — increment attempt counter
  entry.attempts += 1
  if (entry.attempts >= MAX_ATTEMPTS) {
    store.delete(email)
  }
  return false
}
