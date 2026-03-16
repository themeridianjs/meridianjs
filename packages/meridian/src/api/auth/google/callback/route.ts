import jwt from "jsonwebtoken"
import { randomBytes } from "node:crypto"
import type { Response } from "express"
import { storeExchangeCode } from "../_exchange-store.js"
import { validateEmailDomain } from "../../register/_domain-check.js"

/**
 * GET /auth/google/callback?code=...&state=...
 * Handles the Google OAuth redirect. Absent googleOAuthService → 501.
 */
export const GET = async (req: any, res: Response) => {
  let googleOAuthService: any
  try {
    googleOAuthService = req.scope.resolve("googleOAuthService")
  } catch {
    res.status(501).json({ error: { message: "Google OAuth is not configured" } })
    return
  }

  const frontendUrl: string = googleOAuthService.frontendUrl
  const errorRedirect = (msg: string) => {
    // Error messages are not credentials, query param is fine here
    res.redirect(302, `${frontendUrl}/oauth/google/callback?error=${encodeURIComponent(msg)}`)
  }

  const { code, state } = req.query as { code?: string; state?: string }

  if (!code || !state) {
    errorRedirect("Missing authorization code or state")
    return
  }

  const config = req.scope.resolve("config") as any
  const jwtSecret = config?.projectConfig?.jwtSecret as string

  // Verify state JWT
  let statePayload: { nonce: string; flow: string; userId?: string; invite_token?: string }
  try {
    statePayload = jwt.verify(state, jwtSecret, { algorithms: ["HS256"] }) as any
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      errorRedirect("OAuth session expired. Please try again.")
    } else {
      errorRedirect("Invalid OAuth state. Please try again.")
    }
    return
  }

  // CSRF check — nonce must match the HttpOnly cookie
  const cookieNonce = req.cookies?.oauth_nonce
  if (!cookieNonce || cookieNonce !== statePayload.nonce) {
    errorRedirect("CSRF validation failed. Please try again.")
    return
  }

  // Clear the nonce cookie immediately (single-use)
  res.clearCookie("oauth_nonce", { path: "/auth/google/callback" })

  const flow = statePayload.flow
  const inviteToken = statePayload.invite_token

  // ── Link flow: attach Google account to existing user ────────────────────────
  if (flow === "link" && statePayload.userId) {
    let profile: { googleId: string; email: string; firstName: string | null; lastName: string | null; picture: string | null }
    try {
      profile = await googleOAuthService.exchangeCode(code)
    } catch (err: any) {
      errorRedirect(err.message ?? "Failed to authenticate with Google")
      return
    }

    const userService = req.scope.resolve("userModuleService") as any
    // Check if this Google account is already tied to a different user
    try {
      const [existing] = await userService.listUsers({ google_id: profile.googleId }, { limit: 1 })
      if (existing && existing.id !== statePayload.userId) {
        errorRedirect("This Google account is already linked to another user.")
        return
      }
    } catch {
      // listUsers may throw if no results — that's fine, continue
    }

    await userService.updateUser(statePayload.userId, { google_id: profile.googleId })
    res.redirect(302, `${frontendUrl}/oauth/google/callback?linked=true`)
    return
  }

  // Pre-flight invite validation
  let inviteRecord: { id: string; email: string | null; role: string; workspace_id: string; app_role_id: string | null } | null = null
  if (flow === "invite" && inviteToken) {
    try {
      const invitationService = req.scope.resolve("invitationModuleService") as any
      const [invitations] = await invitationService.listAndCountInvitations(
        { token: inviteToken },
        { limit: 1 }
      )
      const invitation = invitations?.[0]
      if (!invitation) {
        errorRedirect("Invitation not found")
        return
      }
      if (invitation.status !== "pending") {
        errorRedirect("Invitation has already been used")
        return
      }
      if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
        errorRedirect("Invitation has expired. Ask for a new one.")
        return
      }
      inviteRecord = {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        workspace_id: invitation.workspace_id,
        app_role_id: invitation.app_role_id ?? null,
      }
    } catch {
      errorRedirect("Failed to validate invitation")
      return
    }
  }

  // For register flow (non-invite), check if open registration is enabled before exchanging code
  let regConfig: { enabled: boolean; allowedDomains: string[] } | undefined
  let registerUserCount = 0
  if (flow === "register" && !inviteRecord) {
    const cfg = req.scope.resolve("config") as any
    regConfig = cfg?.projectConfig?.registration
    try {
      const userService = req.scope.resolve("userModuleService") as any
      const [, count] = await userService.listAndCountUsers({}, { limit: 1 })
      registerUserCount = count
    } catch {
      // assume not first setup
    }
    if (registerUserCount > 0 && !regConfig?.enabled) {
      errorRedirect("Registration is not open. Contact an admin for an invitation.")
      return
    }
  }

  // Exchange code for Google profile
  let profile: { googleId: string; email: string; firstName: string | null; lastName: string | null; picture: string | null }
  try {
    profile = await googleOAuthService.exchangeCode(code)
  } catch (err: any) {
    errorRedirect(err.message ?? "Failed to authenticate with Google")
    return
  }

  // Domain check for open registration (after we have the profile email)
  if (flow === "register" && !inviteRecord && registerUserCount > 0 && regConfig?.enabled) {
    try {
      validateEmailDomain(profile.email, regConfig.allowedDomains)
    } catch {
      errorRedirect("Your email domain is not allowed to register.")
      return
    }
  }

  // Verify invite email matches Google email (if invite has a locked email)
  if (inviteRecord?.email && profile.email.toLowerCase() !== inviteRecord.email.toLowerCase()) {
    errorRedirect(
      `This invitation was sent to ${inviteRecord.email}. Please sign in with that Google account.`
    )
    return
  }

  // Perform login / register
  const autoRegister = flow === "register" && !inviteRecord
  let authResult: { token: string }
  try {
    const authService = req.scope.resolve("authModuleService") as any
    authResult = await authService.loginOrRegisterWithGoogle({
      googleId: profile.googleId,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      picture: profile.picture,
      inviteRecord,
      autoRegister,
    })
  } catch (err: any) {
    errorRedirect(err.message ?? "Authentication failed")
    return
  }

  // Mark invite accepted after successful login/register
  if (flow === "invite" && inviteRecord) {
    try {
      const invitationService = req.scope.resolve("invitationModuleService") as any
      await invitationService.updateInvitation(inviteRecord.id, { status: "accepted" })
    } catch {
      // Non-fatal
    }
  }

  // Issue a one-time code instead of putting the JWT in the redirect URL.
  // The JWT in a redirect URL (even as a hash fragment) appears in the server's
  // access log on the 302 Location header. The frontend exchanges this short-lived
  // code for the real JWT via POST /auth/google/exchange within 2 minutes.
  const exchangeCode = randomBytes(32).toString("hex")
  storeExchangeCode(exchangeCode, authResult.token)
  res.redirect(302, `${frontendUrl}/oauth/google/callback?code=${exchangeCode}`)
}
