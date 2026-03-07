/**
 * In-memory OTP store for password create/change flow.
 *
 * One active OTP per user. 6-digit numeric code, 10-minute TTL.
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
}

const STORE_KEY = "__meridian_password_otp_store__"
const OTP_TTL_MS = 10 * 60 * 1000  // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000 // 60 seconds

function getStore(): Map<string, OtpEntry> {
  if (!(globalThis as any)[STORE_KEY]) {
    ;(globalThis as any)[STORE_KEY] = new Map<string, OtpEntry>()
  }
  return (globalThis as any)[STORE_KEY]
}

/** Generate and store a 6-digit OTP for a user. Throws if rate-limited. */
export function generateAndStoreOtp(userId: string): string {
  const store = getStore()
  const existing = store.get(userId)
  if (existing && Date.now() - existing.sentAt < RESEND_COOLDOWN_MS) {
    throw Object.assign(new Error("Please wait before requesting a new code"), { status: 429 })
  }

  const otp = String(randomInt(100000, 999999))
  store.set(userId, { otp, expiresAt: Date.now() + OTP_TTL_MS, sentAt: Date.now() })
  return otp
}

/** Consume an OTP. Always deletes the entry (single-use). Returns true if valid. */
export function consumeOtp(userId: string, otp: string): boolean {
  const store = getStore()
  const entry = store.get(userId)
  store.delete(userId)
  if (!entry || entry.expiresAt < Date.now()) return false
  return entry.otp === otp
}
