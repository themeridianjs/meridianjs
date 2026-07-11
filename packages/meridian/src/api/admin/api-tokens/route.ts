import type { Response, NextFunction } from "express"

const VALID_SCOPES = ["read", "write"] as const
const MAX_NAME_LENGTH = 100

/** Serializes a token record for API responses — never exposes token_hash. */
export function toApiTokenDto(record: any) {
  return {
    id: record.id,
    name: record.name,
    token_prefix: record.token_prefix,
    scopes: record.scopes,
    expires_at: record.expires_at,
    last_used_at: record.last_used_at,
    revoked_at: record.revoked_at,
    created_at: record.created_at,
  }
}

export const GET = async (req: any, res: Response, next: NextFunction) => {
  try {
    const apiTokenService = req.scope.resolve("apiTokenModuleService") as any
    const [tokens] = await apiTokenService.listAndCountApiTokens(
      { user_id: req.user.id },
      { orderBy: { created_at: "DESC" } }
    )
    res.json({ api_tokens: tokens.map(toApiTokenDto) })
  } catch (err) {
    next(err)
  }
}

export const POST = async (req: any, res: Response, next: NextFunction) => {
  try {
    // A leaked token must not be able to mint fresh tokens for its owner.
    if (req.user?.authType === "api-token") {
      res.status(403).json({ error: { message: "API tokens cannot create other API tokens" } })
      return
    }

    const { name, scopes, expires_in_days } = req.body ?? {}

    if (typeof name !== "string" || !name.trim() || name.trim().length > MAX_NAME_LENGTH) {
      res.status(400).json({ error: { message: `name is required (max ${MAX_NAME_LENGTH} chars)` } })
      return
    }
    if (
      !Array.isArray(scopes) ||
      scopes.length === 0 ||
      !scopes.every((s: unknown) => (VALID_SCOPES as readonly string[]).includes(s as string))
    ) {
      res.status(400).json({ error: { message: 'scopes must be a non-empty array of "read" / "write"' } })
      return
    }
    if (
      expires_in_days != null &&
      (!Number.isInteger(expires_in_days) || expires_in_days <= 0 || expires_in_days > 3650)
    ) {
      res.status(400).json({ error: { message: "expires_in_days must be a positive integer (max 3650)" } })
      return
    }

    const apiTokenService = req.scope.resolve("apiTokenModuleService") as any
    const { token, apiToken } = await apiTokenService.createToken({
      user_id: req.user.id,
      name: name.trim(),
      scopes: [...new Set(scopes)],
      expires_in_days: expires_in_days ?? null,
    })

    // The plaintext token appears in this response only — it is never retrievable again.
    res.status(201).json({ token, api_token: toApiTokenDto(apiToken) })
  } catch (err) {
    next(err)
  }
}
