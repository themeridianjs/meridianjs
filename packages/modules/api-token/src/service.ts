import { MeridianService } from "@meridianjs/framework-utils"
import type { MeridianContainer } from "@meridianjs/types"
import { createHash, randomBytes } from "node:crypto"
import ApiTokenModel from "./models/api-token.js"

export const API_TOKEN_PREFIX = "mrd_"
export type ApiTokenScope = "read" | "write"

/** Length of the displayed prefix, e.g. "mrd_a1b2c3d4". */
const DISPLAY_PREFIX_LENGTH = 12
/** Don't write last_used_at more than once per minute per token. */
const LAST_USED_THROTTLE_MS = 60_000

function hashToken(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex")
}

export class ApiTokenModuleService extends MeridianService({ ApiToken: ApiTokenModel }) {
  private readonly container: MeridianContainer

  constructor(container: MeridianContainer) {
    super(container)
    this.container = container
  }

  /**
   * Creates a personal access token. The plaintext token is returned exactly
   * once — only its sha256 hash is persisted.
   */
  async createToken(data: {
    user_id: string
    name: string
    scopes: ApiTokenScope[]
    expires_in_days?: number | null
  }) {
    const token = API_TOKEN_PREFIX + randomBytes(32).toString("hex")
    const apiToken = await this.createApiToken({
      user_id: data.user_id,
      name: data.name,
      token_hash: hashToken(token),
      token_prefix: token.slice(0, DISPLAY_PREFIX_LENGTH),
      scopes: data.scopes,
      expires_at: data.expires_in_days
        ? new Date(Date.now() + data.expires_in_days * 24 * 60 * 60 * 1000)
        : null,
      last_used_at: null,
      revoked_at: null,
    })
    return { token, apiToken }
  }

  /**
   * Looks up a token by the hash of its plaintext. Returns the record when
   * valid, or null when unknown, revoked, or expired.
   */
  async verifyToken(plaintext: string) {
    if (!plaintext.startsWith(API_TOKEN_PREFIX)) return null
    const [rows] = await this.listAndCountApiTokens(
      { token_hash: hashToken(plaintext) },
      { limit: 1 }
    )
    const record = rows[0]
    if (!record || record.revoked_at) return null
    if (record.expires_at && new Date(record.expires_at) < new Date()) return null
    return record
  }

  async revokeToken(id: string) {
    return this.updateApiToken(id, { revoked_at: new Date() })
  }

  /**
   * Records token usage. Throttled so a busy token causes at most one write
   * per minute; failures are swallowed — usage tracking must never break auth.
   */
  async touchLastUsed(id: string, lastUsedAt: Date | string | null): Promise<void> {
    if (lastUsedAt && Date.now() - new Date(lastUsedAt).getTime() < LAST_USED_THROTTLE_MS) {
      return
    }
    try {
      await this.updateApiToken(id, { last_used_at: new Date() })
    } catch {
      // ignore — see docblock
    }
  }
}
