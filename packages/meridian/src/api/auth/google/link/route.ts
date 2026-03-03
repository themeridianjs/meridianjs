import { randomBytes } from "node:crypto"
import jwt from "jsonwebtoken"
import type { Response } from "express"

/**
 * GET /auth/google/link?token=<jwt>
 * Initiates the Google OAuth link flow (connecting Google to an existing account).
 * The JWT is accepted via query param so this can be a full-page navigation —
 * which is required to ensure the nonce cookie is stored correctly (cross-origin
 * XHR responses silently discard Set-Cookie headers in all modern browsers).
 */
export const GET = async (req: any, res: Response) => {
  // Accept token from query param (full-page navigation) or Authorization header (fallback)
  const authHeader = req.headers.authorization as string | undefined
  const token =
    (req.query as { token?: string }).token ||
    (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null)

  if (!token) {
    res.status(401).json({ error: { message: "token query parameter or Authorization header required" } })
    return
  }

  const config = req.scope.resolve("config") as any
  const jwtSecret = config?.projectConfig?.jwtSecret as string

  let payload: { sub?: string; id?: string }
  try {
    payload = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] }) as any
  } catch {
    res.status(401).json({ error: { message: "Invalid or expired token" } })
    return
  }

  const userId = (payload.sub ?? payload.id) as string | undefined
  if (!userId) {
    res.status(401).json({ error: { message: "Invalid token: missing user id" } })
    return
  }

  let googleOAuthService: any
  try {
    googleOAuthService = req.scope.resolve("googleOAuthService")
  } catch {
    res.status(501).json({ error: { message: "Google OAuth is not configured" } })
    return
  }

  const nonce = randomBytes(16).toString("hex")
  const statePayload = { nonce, flow: "link", userId }
  const state = jwt.sign(statePayload, jwtSecret, { expiresIn: "10m", algorithm: "HS256" })

  res.cookie("oauth_nonce", nonce, {
    httpOnly: true,
    sameSite: "lax",
    path: "/auth/google/callback",
    maxAge: 600_000,
    secure: process.env.NODE_ENV === "production",
  })

  const url: string = googleOAuthService.getAuthUrl(state)
  res.redirect(302, url)
}
