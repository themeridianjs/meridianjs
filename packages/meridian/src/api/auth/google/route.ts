import { randomBytes } from "crypto"
import jwt from "jsonwebtoken"
import type { Response } from "express"

/**
 * GET /auth/google?flow=login|register|invite&invite_token=<tok>
 * Initiates Google OAuth flow. Absent googleOAuthService → 501.
 */
export const GET = async (req: any, res: Response) => {
  let googleOAuthService: any
  try {
    googleOAuthService = req.scope.resolve("googleOAuthService")
  } catch {
    res.status(501).json({ error: { message: "Google OAuth is not configured" } })
    return
  }

  const flow = req.query.flow as string
  if (!["login", "register", "invite"].includes(flow)) {
    res.status(400).json({ error: { message: "Invalid flow. Must be login, register, or invite." } })
    return
  }

  if (flow === "invite" && !req.query.invite_token) {
    res.status(400).json({ error: { message: "invite_token is required for invite flow" } })
    return
  }

  const config = req.scope.resolve("config") as any
  const jwtSecret = config?.projectConfig?.jwtSecret as string

  // Generate a cryptographically random nonce for CSRF protection
  const nonce = randomBytes(16).toString("hex")

  // Sign a state JWT containing the nonce and flow metadata
  const statePayload: Record<string, string> = { nonce, flow }
  if (flow === "invite" && req.query.invite_token) {
    statePayload.invite_token = req.query.invite_token as string
  }
  const state = jwt.sign(statePayload, jwtSecret, { expiresIn: "10m", algorithm: "HS256" })

  // HttpOnly SameSite=Lax nonce cookie scoped to the callback path
  res.cookie("oauth_nonce", nonce, {
    httpOnly: true,
    sameSite: "lax",
    path: "/auth/google/callback",
    maxAge: 600_000,
    secure: process.env.NODE_ENV === "production",
  })

  res.redirect(302, googleOAuthService.getAuthUrl(state))
}
