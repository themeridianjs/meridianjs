import type { Response } from "express"
import { consumeExchangeCode } from "../_exchange-store.js"

/**
 * POST /auth/google/exchange
 * Public — exchanges a short-lived one-time code (issued by the OAuth callback)
 * for the real JWT. The code is valid for 2 minutes and cannot be reused.
 *
 * This keeps the JWT out of redirect URLs (and therefore out of server access logs).
 */
export const POST = async (req: any, res: Response) => {
  const { code } = req.body as { code?: string }

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: { message: "code is required" } })
    return
  }

  const token = consumeExchangeCode(code)

  if (!token) {
    res.status(401).json({ error: { message: "Invalid or expired exchange code" } })
    return
  }

  res.json({ token })
}
