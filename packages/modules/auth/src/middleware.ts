import jwt from "jsonwebtoken"
import type { Response, NextFunction } from "express"
import type { MeridianConfig, MeridianContainer } from "@meridianjs/types"

/**
 * Express middleware that validates a Bearer JWT on every request.
 *
 * On success, populates req.user = { id, workspaceId, roles, permissions, jti } and calls next().
 * Also validates the session against the DB (stateful revocation support).
 * On failure, responds 401 Unauthorized.
 */
export function authenticateJWT(req: any, res: Response, next: NextFunction): void {
  // Accept token from Authorization header (standard) or ?token= query param
  // (used by SSE connections since EventSource cannot set custom headers)
  const authHeader = req.headers.authorization as string | undefined
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : (req.query?.token as string | undefined)

  if (!token) {
    res.status(401).json({ error: { message: "Unauthorized — Bearer token required" } })
    return
  }

  ;(async () => {
    let config: MeridianConfig
    try {
      const scope = req.scope as MeridianContainer
      config = scope.resolve<MeridianConfig>("config")
    } catch {
      res.status(500).json({ error: { message: "Server misconfiguration" } })
      return
    }

    try {
      const payload = jwt.verify(token, config.projectConfig.jwtSecret, { algorithms: ["HS256"] }) as any

      // Validate session is not revoked (stateful check)
      if (payload.jti) {
        try {
          const scope = req.scope as MeridianContainer
          const userService = scope.resolve<any>("userModuleService")
          const valid = await userService.isSessionValid(payload.jti)
          if (!valid) {
            res.status(401).json({ error: { message: "Session revoked or expired" } })
            return
          }
        } catch (sessionErr) {
          // Session service unavailable — fail closed (401) to prevent revoked
          // sessions from being treated as valid when the DB is unreachable.
          try {
            const scope = req.scope as MeridianContainer
            const logger = scope.resolve<any>("logger")
            logger.warn(`[auth] jti session check failed: ${sessionErr instanceof Error ? sessionErr.message : String(sessionErr)}`)
          } catch { /* logger unavailable */ }
          res.status(401).json({ error: { message: "Session validation unavailable" } })
          return
        }
      }

      req.user = {
        id: payload.sub as string,
        workspaceId: payload.workspaceId ?? null,
        roles: Array.isArray(payload.roles) ? payload.roles : [],
        permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
        jti: payload.jti ?? null,
      }
      next()
    } catch {
      res.status(401).json({ error: { message: "Invalid or expired token" } })
    }
  })()
}
