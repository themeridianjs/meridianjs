import type { Response, NextFunction } from "express"

/**
 * RBAC guard — allows the request only if `req.user.roles` contains at least
 * one of the specified roles.
 *
 * Must be used after `authenticateJWT` so that `req.user` is populated.
 *
 * @example
 * { matcher: "/admin/settings", middlewares: [authenticateJWT, requireRoles("admin")] }
 */
export function requireRoles(...roles: string[]) {
  return (req: any, res: Response, next: NextFunction) => {
    const userRoles: string[] = req.user?.roles ?? []
    if (roles.some((r) => userRoles.includes(r))) return next()
    res.status(403).json({ error: { message: "Forbidden" } })
  }
}

/**
 * Workspace isolation guard — rejects requests where the `workspace_id` query
 * param or body field does not match the authenticated user's workspace.
 *
 * Allows the request through when no `workspace_id` is present (so general
 * listing endpoints that omit workspace_id are not blocked).
 *
 * Must be used after `authenticateJWT`.
 */
export function requireWorkspace(req: any, res: Response, next: NextFunction) {
  const workspaceId = (req.query?.workspace_id ?? req.body?.workspace_id) as string | undefined
  if (workspaceId && req.user?.workspaceId && req.user.workspaceId !== workspaceId) {
    return res.status(403).json({ error: { message: "Forbidden — wrong workspace" } })
  }
  next()
}
