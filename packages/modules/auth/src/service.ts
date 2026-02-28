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
