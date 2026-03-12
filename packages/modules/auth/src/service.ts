import { MeridianService } from "@meridianjs/framework-utils"
import type { MeridianContainer, MeridianConfig } from "@meridianjs/types"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { randomBytes, randomUUID } from "crypto"

const BCRYPT_ROUNDS = 12
const JWT_EXPIRES_IN = "7d"
const JWT_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000
const RESET_TOKEN_EXPIRES_MS = 30 * 60 * 1000 // 30 minutes

export type UserRole = "super-admin" | "admin" | "moderator" | "member"

export interface RegisterInput {
  email: string
  password: string
  first_name?: string
  last_name?: string
  /**
   * @internal — Only used by the invite flow. Public registration always
   * derives the role automatically (first user → super-admin, else member).
   * Callers must never expose this to untrusted input.
   */
  _inviteRole?: UserRole
}

export interface LoginInput {
  email: string
  password: string
}

export interface AuthResult {
  user: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
  }
  token: string
}

export interface JwtPayload {
  sub: string
  workspaceId: string | null
  roles: string[]
  permissions: string[]
  jti?: string
  iat?: number
  exp?: number
}

export interface GoogleAuthInput {
  googleId: string
  email: string
  firstName: string | null
  lastName: string | null
  picture: string | null
  inviteRecord?: {
    id: string
    email: string | null
    role: string
    workspace_id: string
    app_role_id: string | null
  } | null
}

export class AuthModuleService extends MeridianService({}) {
  private readonly container: MeridianContainer

  constructor(container: MeridianContainer) {
    super(container)
    this.container = container
  }

  /** Register a new user and return a signed JWT. */
  async register(input: RegisterInput): Promise<AuthResult> {
    const userService = this.container.resolve<any>("userModuleService")
    const config = this.container.resolve<MeridianConfig>("config")

    const existing = await userService.retrieveUserByEmail(input.email)
    if (existing) {
      throw Object.assign(new Error("Email already registered"), { status: 409 })
    }

    const password_hash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)

    // Role is determined internally: first user → super-admin, else member.
    // The _inviteRole field is only used by the controlled invite acceptance flow.
    let role: UserRole = "member"
    if (input._inviteRole) {
      role = input._inviteRole
    } else {
      const [, userCount] = await userService.listAndCountUsers({}, { limit: 1 })
      if (userCount === 0) role = "super-admin"
    }

    const user = await userService.createUser({
      email: input.email.toLowerCase().trim(),
      password_hash,
      first_name: input.first_name ?? null,
      last_name: input.last_name ?? null,
      role,
      is_active: true,
    })

    const permissions = await this.resolvePermissions(user.app_role_id)
    const { token, jti, expiresAt } = this.signToken(user.id, null, [user.role], permissions, config.projectConfig.jwtSecret)

    await userService.createSession(jti, user.id, expiresAt).catch(() => {})

    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name ?? null,
        last_name: user.last_name ?? null,
      },
      token,
    }
  }

  /** Authenticate with email + password and return a signed JWT. */
  async login(input: LoginInput): Promise<AuthResult> {
    const userService = this.container.resolve<any>("userModuleService")
    const config = this.container.resolve<MeridianConfig>("config")

    const user = await userService.retrieveUserByEmail(input.email.toLowerCase().trim())
    if (!user) {
      throw Object.assign(new Error("Invalid credentials"), { status: 401 })
    }

    if (user.deleted_at) {
      throw Object.assign(new Error("Invalid credentials"), { status: 401 })
    }

    if (!user.is_active) {
      throw Object.assign(new Error("Account deactivated"), { status: 403 })
    }

    const valid = await bcrypt.compare(input.password, user.password_hash)
    if (!valid) {
      throw Object.assign(new Error("Invalid credentials"), { status: 401 })
    }

    // Non-critical — don't fail login if timestamp update fails
    await userService.recordLogin(user.id).catch(() => {})

    const permissions = await this.resolvePermissions(user.app_role_id)
    const { token, jti, expiresAt } = this.signToken(user.id, null, [user.role ?? "member"], permissions, config.projectConfig.jwtSecret)

    await userService.createSession(jti, user.id, expiresAt).catch(() => {})

    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name ?? null,
        last_name: user.last_name ?? null,
      },
      token,
    }
  }

  /**
   * Sign in or register a user via Google OAuth.
   * 1. Look up by google_id — existing SSO user
   * 2. Look up by email — link google_id to existing account
   * 3. Create new user
   */
  async loginOrRegisterWithGoogle(input: GoogleAuthInput): Promise<AuthResult> {
    const userService = this.container.resolve<any>("userModuleService")
    const config = this.container.resolve<MeridianConfig>("config")

    // Step 1: existing Google user
    let user = await userService.retrieveUserByGoogleId(input.googleId)

    if (!user) {
      // Step 2: check for an existing password-based account with this email.
      // We do NOT auto-link — doing so silently would allow anyone with a Google
      // account at the same email address to take over existing accounts without
      // knowing the password. Instead, surface a clear error and direct the user
      // to link Google from their account settings while logged in.
      const existingByEmail = await userService.retrieveUserByEmail(input.email.toLowerCase().trim())
      if (existingByEmail) {
        throw Object.assign(
          new Error(
            "GOOGLE_NOT_LINKED: Your Google account is not connected yet. " +
            "Please sign in with your email and password, then connect Google from your Profile settings to use Google sign-in."
          ),
          { status: 409 }
        )
      }
    }

    if (user) {
      if (user.deleted_at) {
        throw Object.assign(new Error("Invalid credentials"), { status: 401 })
      }

      if (!user.is_active) {
        throw Object.assign(new Error("Account deactivated"), { status: 403 })
      }
      // Set avatar from Google profile picture if user doesn't have one yet
      if (!user.avatar_url && input.picture) {
        await userService.updateUser(user.id, { avatar_url: input.picture }).catch(() => {})
      }
      await userService.recordLogin(user.id).catch(() => {})
      const permissions = await this.resolvePermissions(user.app_role_id)
      const { token, jti, expiresAt } = this.signToken(user.id, null, [user.role ?? "member"], permissions, config.projectConfig.jwtSecret)
      await userService.createSession(jti, user.id, expiresAt).catch(() => {})
      return {
        user: { id: user.id, email: user.email, first_name: user.first_name ?? null, last_name: user.last_name ?? null },
        token,
      }
    }

    // Step 3: create new user — only allowed if first user or via invite
    const invite = input.inviteRecord

    let role: UserRole = "member"
    if (invite) {
      role = (invite.role as UserRole) ?? "member"
    } else {
      const [, userCount] = await userService.listAndCountUsers({}, { limit: 1 })
      if (userCount === 0) {
        role = "super-admin"
      } else {
        // Not first user and no invite — blocked
        throw Object.assign(
          new Error("You are not authorized to access this application. Contact an admin for an invitation."),
          { status: 403 }
        )
      }
    }

    // password_hash stays non-nullable — use a random unusable hash (bcrypt cost 1 for speed, user can't know it)
    const password_hash = await bcrypt.hash(randomUUID(), 1)

    const newUser = await userService.createUser({
      email: input.email.toLowerCase().trim(),
      password_hash,
      first_name: input.firstName ?? null,
      last_name: input.lastName ?? null,
      role,
      is_active: true,
      has_password: false,
      google_id: input.googleId,
      avatar_url: input.picture ?? null,
      ...(invite?.app_role_id ? { app_role_id: invite.app_role_id } : {}),
    })

    if (invite) {
      try {
        const workspaceMemberService = this.container.resolve<any>("workspaceMemberModuleService")
        // workspace_member.role only supports "admin" | "member" — map super-admin → admin
        const wsRole = invite.role === "member" ? "member" : "admin"
        await workspaceMemberService.ensureMember(invite.workspace_id, newUser.id, wsRole)
      } catch {
        // Non-fatal — user created, workspace membership assignment failed
      }
    }

    const permissions = await this.resolvePermissions(newUser.app_role_id)
    const { token, jti, expiresAt } = this.signToken(newUser.id, null, [newUser.role], permissions, config.projectConfig.jwtSecret)
    await userService.createSession(jti, newUser.id, expiresAt).catch(() => {})

    return {
      user: { id: newUser.id, email: newUser.email, first_name: newUser.first_name ?? null, last_name: newUser.last_name ?? null },
      token,
    }
  }

  /**
   * Restore a soft-deleted user via an invite link.
   * Updates their name, password, and role, then issues a fresh session token.
   * The user's ID — and all history tied to it — is preserved.
   */
  async restoreFromInvite(
    userId: string,
    input: { password: string; first_name?: string; last_name?: string; role?: UserRole }
  ): Promise<AuthResult> {
    const userService = this.container.resolve<any>("userModuleService")
    const config = this.container.resolve<MeridianConfig>("config")

    // Validate that the role is one of the known roles — prevent injection
    const allowedRoles: UserRole[] = ["super-admin", "admin", "moderator", "member"]
    const role: UserRole = (input.role && allowedRoles.includes(input.role)) ? input.role : "member"

    const password_hash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)
    const user = await userService.restoreUser(userId, {
      password_hash,
      first_name: input.first_name ?? null,
      last_name: input.last_name ?? null,
      role,
    })

    const permissions = await this.resolvePermissions(user.app_role_id)
    const { token, jti, expiresAt } = this.signToken(user.id, null, [user.role], permissions, config.projectConfig.jwtSecret)
    await userService.createSession(jti, user.id, expiresAt).catch(() => {})

    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name ?? null,
        last_name: user.last_name ?? null,
      },
      token,
    }
  }

  /** Set (or reset) password for a user. Used after OTP verification. */
  async setPassword(userId: string, newPassword: string): Promise<void> {
    const userService = this.container.resolve<any>("userModuleService")
    const password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
    await userService.updateUser(userId, { password_hash, has_password: true })
    // Revoke all existing sessions so old credentials can't be reused
    await userService.revokeAllUserSessions(userId).catch(() => {})
  }

  /**
   * Generate a password reset token for the given email.
   * Returns the token and user info so the caller can emit an event / send an email.
   * Returns null (instead of throwing) when the email isn't found — prevents enumeration.
   */
  async requestPasswordReset(email: string): Promise<{ token: string; userId: string; email: string } | null> {
    const userService = this.container.resolve<any>("userModuleService")
    const config = this.container.resolve<MeridianConfig>("config")

    const user = await userService.retrieveUserByEmail(email.toLowerCase().trim())
    if (!user || user.deleted_at || !user.is_active) return null

    const resetToken = randomBytes(32).toString("hex")
    const payload = { sub: user.id, purpose: "password_reset", jti: resetToken }
    const signedToken = jwt.sign(payload, config.projectConfig.jwtSecret, { expiresIn: "30m" })

    return { token: signedToken, userId: user.id, email: user.email }
  }

  /** Validate a password reset token and set the new password. */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const config = this.container.resolve<MeridianConfig>("config")
    const userService = this.container.resolve<any>("userModuleService")

    let payload: { sub: string; purpose: string }
    try {
      payload = jwt.verify(token, config.projectConfig.jwtSecret, { algorithms: ["HS256"] }) as any
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        throw Object.assign(new Error("Reset link has expired. Please request a new one."), { status: 400 })
      }
      throw Object.assign(new Error("Invalid reset link"), { status: 400 })
    }

    if (payload.purpose !== "password_reset") {
      throw Object.assign(new Error("Invalid reset link"), { status: 400 })
    }

    const user = await userService.retrieveUser(payload.sub)
    if (!user || user.deleted_at || !user.is_active) {
      throw Object.assign(new Error("Account not found or inactive"), { status: 400 })
    }

    const password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
    await userService.updateUser(payload.sub, { password_hash })

    // Revoke all existing sessions so the old password can't be used
    await userService.revokeAllUserSessions(payload.sub).catch(() => {})
  }

  /** Verify a JWT and return its decoded payload. Throws if invalid or expired. */
  verifyToken(token: string, secret: string): JwtPayload {
    return jwt.verify(token, secret, { algorithms: ["HS256"] }) as JwtPayload
  }

  /** Resolve permissions for a given app_role_id — gracefully degrades if module not loaded. */
  private async resolvePermissions(appRoleId: string | null | undefined): Promise<string[]> {
    if (!appRoleId) return []
    try {
      const appRoleService = this.container.resolve<any>("appRoleModuleService")
      return await appRoleService.getPermissionsForRole(appRoleId)
    } catch {
      return []
    }
  }

  private signToken(
    userId: string,
    workspaceId: string | null,
    roles: string[],
    permissions: string[],
    secret: string
  ): { token: string; jti: string; expiresAt: Date } {
    const jti = randomUUID()
    const expiresAt = new Date(Date.now() + JWT_EXPIRES_MS)
    const token = jwt.sign({ sub: userId, workspaceId, roles, permissions, jti }, secret, {
      expiresIn: JWT_EXPIRES_IN,
    })
    return { token, jti, expiresAt }
  }
}
