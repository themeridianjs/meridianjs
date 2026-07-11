import type { Response, NextFunction } from "express"
import { ROLES } from "@meridianjs/types"
import { authenticateJWT } from "./middleware.js"

/** Personal access tokens are prefixed so the two credential kinds are distinguishable. */
const API_TOKEN_PREFIX = "mrd_"

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

/**
 * Builds an Express middleware that accepts EITHER a session JWT or a
 * personal access token (PAT, "mrd_..." prefix) on Authorization: Bearer.
 *
 * JWTs are delegated to authenticateJWT unchanged (including its ?token=
 * query-param fallback for SSE). PATs are only accepted via the header —
 * never via query param — so they can't leak into logs or referrers.
 *
 * On PAT success, req.user has the same shape authenticateJWT attaches, plus
 * authType: "api-token", tokenScopes, and tokenId.
 *
 * enforceMethodScopes: when true, read-only tokens (no "write" scope) may only
 * perform GET/HEAD/OPTIONS. Use false for endpoints where reads travel over
 * POST (e.g. MCP JSON-RPC) and scope checks happen per-operation instead.
 */
export function createAuthenticate(opts: { enforceMethodScopes: boolean }) {
  return function authenticate(req: any, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization as string | undefined
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : undefined

    if (!bearer || !bearer.startsWith(API_TOKEN_PREFIX)) {
      authenticateJWT(req, res, next)
      return
    }

    ;(async () => {
      let apiTokenService: any
      try {
        apiTokenService = req.scope.resolve("apiTokenModuleService")
      } catch {
        res.status(401).json({ error: { message: "API tokens are not enabled" } })
        return
      }

      const record = await apiTokenService.verifyToken(bearer)
      if (!record) {
        res.status(401).json({ error: { message: "Invalid, expired, or revoked API token" } })
        return
      }

      const userService = req.scope.resolve("userModuleService") as any
      const user = await userService.retrieveUser(record.user_id).catch(() => null)
      if (!user || user.deleted_at || !user.is_active) {
        res.status(401).json({ error: { message: "Token owner not found or deactivated" } })
        return
      }

      // Resolve permissions the same way login does — degrade to [] if the
      // app-role module is unavailable.
      let permissions: string[] = []
      if (user.app_role_id) {
        try {
          const appRoleService = req.scope.resolve("appRoleModuleService") as any
          permissions = await appRoleService.getPermissionsForRole(user.app_role_id)
        } catch {
          permissions = []
        }
      }

      const scopes: string[] = Array.isArray(record.scopes) ? record.scopes : []
      if (opts.enforceMethodScopes && !scopes.includes("write") && !READ_METHODS.has(req.method)) {
        res.status(403).json({ error: { message: "Forbidden — API token is read-only" } })
        return
      }

      req.user = {
        id: user.id,
        workspaceId: null,
        roles: [user.role ?? ROLES.MEMBER],
        permissions,
        jti: null,
        authType: "api-token",
        tokenScopes: scopes,
        tokenId: record.id,
      }

      // Awaited on purpose: a detached write would race the route handler's
      // queries on the request's shared EntityManager. touchLastUsed is
      // throttled to one write per minute and swallows its own failures.
      await apiTokenService.touchLastUsed(record.id, record.last_used_at)

      next()
    })().catch(() => {
      // Fail closed — any unexpected error (DB down, etc.) means no auth.
      if (!res.headersSent) {
        res.status(401).json({ error: { message: "Authentication failed" } })
      }
    })
  }
}

/** For REST surfaces (/admin): read-only tokens are limited to safe HTTP methods. */
export const authenticate = createAuthenticate({ enforceMethodScopes: true })

/** For RPC-style surfaces (/mcp) where reads travel over POST. */
export const authenticateBearer = createAuthenticate({ enforceMethodScopes: false })
