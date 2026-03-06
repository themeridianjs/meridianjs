import { MeridianService } from "@meridianjs/framework-utils"
import type { MeridianContainer, MeridianConfig } from "@meridianjs/types"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { randomUUID } from "crypto"

const BCRYPT_ROUNDS = 12
const JWT_EXPIRES_IN = "7d"
const JWT_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000

export type UserRole = "super-admin" | "admin" | "moderator" | "member"

export interface RegisterInput {
  email: string
  password: string
  first_name?: string
  last_name?: string
  role?: UserRole
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

    // If no role is specified, the first registered user becomes super-admin;
    // all subsequent users default to member.
    let role: UserRole = input.role ?? "member"
    if (!input.role) {
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
            "An account with this email already exists. Please sign in with your password. " +
            "You can link Google sign-in from your account settings afterwards."
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
      google_id: input.googleId,
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

    const password_hash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)
    const user = await userService.restoreUser(userId, {
      password_hash,
      first_name: input.first_name ?? null,
      last_name: input.last_name ?? null,
      role: input.role ?? "member",
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
