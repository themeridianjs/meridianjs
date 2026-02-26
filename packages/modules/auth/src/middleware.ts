import jwt from "jsonwebtoken"
import type { Response, NextFunction } from "express"
import type { MeridianConfig, MeridianContainer } from "@meridianjs/types"

/**
 * Express middleware that validates a Bearer JWT on every request.
 *
 * On success, populates req.user = { id, workspaceId, roles } and calls next().
 * On failure, responds 401 Unauthorized.
 *
 * Reads jwtSecret from req.scope (the request-scoped DI container that is
 * attached by the framework before any middleware runs).
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

  let config: MeridianConfig
  try {
    const scope = req.scope as MeridianContainer
    config = scope.resolve<MeridianConfig>("config")
  } catch {
    res.status(500).json({ error: { message: "Server misconfiguration" } })
    return
  }

  try {
    const payload = jwt.verify(token, config.projectConfig.jwtSecret) as any
    req.user = {
      id: payload.sub as string,
      workspaceId: payload.workspaceId ?? null,
      roles: Array.isArray(payload.roles) ? payload.roles : [],
      permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
    }
    next()
  } catch {
    res.status(401).json({ error: { message: "Invalid or expired token" } })
  }
}
