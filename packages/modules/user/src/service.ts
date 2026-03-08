import { MeridianService } from "@meridianjs/framework-utils"
import type { MeridianContainer } from "@meridianjs/types"
import UserModel from "./models/user.js"
import TeamModel from "./models/team.js"
import UserSessionModel from "./models/user-session.js"

export class UserModuleService extends MeridianService({ User: UserModel, Team: TeamModel, UserSession: UserSessionModel }) {
  // Subclasses store their own container reference for custom methods
  private readonly container: MeridianContainer

  constructor(container: MeridianContainer) {
    super(container)
    this.container = container
  }

  /** Find a user by email. Returns null if not found. */
  async retrieveUserByEmail(email: string): Promise<any | null> {
    const userRepository = this.container.resolve<any>("userRepository")
    try {
      return await userRepository.findOneOrFail({ email })
    } catch {
      return null
    }
  }

  /** Find a user by Google ID. Returns null if not found. */
  async retrieveUserByGoogleId(googleId: string): Promise<any | null> {
    const userRepository = this.container.resolve<any>("userRepository")
    try {
      return await userRepository.findOneOrFail({ google_id: googleId })
    } catch {
      return null
    }
  }

  /** Update user's last login timestamp. */
  async recordLogin(userId: string): Promise<void> {
    await (this as any).updateUser(userId, { last_login_at: new Date() })
  }

  /** Deactivate a user account. */
  async deactivateUser(userId: string): Promise<any> {
    return (this as any).updateUser(userId, { is_active: false })
  }

  /** Reactivate a previously deactivated user account. */
  async reactivateUser(userId: string): Promise<any> {
    return (this as any).updateUser(userId, { is_active: true })
  }

  /**
   * Restore a soft-deleted user account.
   * Bypasses UPDATE_RESERVED to clear deleted_at directly via the repository.
   */
  async restoreUser(userId: string, data: Record<string, unknown> = {}): Promise<any> {
    const repo = this.container.resolve<any>("userRepository")
    const user = await repo.findOneOrFail({ id: userId })
    Object.assign(user, { ...data, deleted_at: null, is_active: true })
    await repo.flush()
    return user
  }

  /**
   * Fetch multiple users by ID in a single query.
   * Returns a Map keyed by user ID for O(1) lookup.
   */
  async listUsersByIds(ids: string[], options?: { includeInactive?: boolean }): Promise<Map<string, any>> {
    if (!ids.length) return new Map()
    const userRepository = this.container.resolve<any>("userRepository")
    const filters: Record<string, any> = { id: { $in: ids } }
    if (!options?.includeInactive) {
      filters.is_active = true
      filters.deleted_at = null
    }
    const users = await userRepository.find(filters)
    return new Map(users.map((u: any) => [u.id, u]))
  }

  /** Return the total number of registered users. */
  async countUsers(): Promise<number> {
    const userRepository = this.container.resolve<any>("userRepository")
    const [, count] = await userRepository.findAndCount({})
    return count
  }

  // ── Session management (stateful JWT) ───────────────────────────────────────

  /** Store a new session record when a token is issued. */
  async createSession(jti: string, userId: string, expiresAt: Date): Promise<void> {
    const repo = this.container.resolve<any>("userSessionRepository")
    const session = repo.create({ jti, user_id: userId, expires_at: expiresAt })
    await repo.persistAndFlush(session)
  }

  /** Returns true if the session is valid (exists, not revoked, not expired). */
  async isSessionValid(jti: string): Promise<boolean> {
    const repo = this.container.resolve<any>("userSessionRepository")
    try {
      const session = await repo.findOne({ jti })
      if (!session) return false
      if (session.revoked_at) return false
      if (new Date(session.expires_at) < new Date()) return false
      return true
    } catch {
      return false
    }
  }

  /** Revoke a single session by jti (logout). */
  async revokeSession(jti: string): Promise<void> {
    const repo = this.container.resolve<any>("userSessionRepository")
    const session = await repo.findOne({ jti })
    if (session) {
      session.revoked_at = new Date()
      await repo.flush()
    }
  }

  /** Revoke all active sessions for a user (admin-initiated kick). */
  async revokeAllUserSessions(userId: string): Promise<void> {
    const repo = this.container.resolve<any>("userSessionRepository")
    const sessions = await repo.find({ user_id: userId, revoked_at: null })
    const now = new Date()
    for (const s of sessions) {
      s.revoked_at = now
    }
    if (sessions.length > 0) await repo.flush()
  }
}
