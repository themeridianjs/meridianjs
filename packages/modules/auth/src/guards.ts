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
 * Permission guard — allows the request if `req.user.roles` includes "super-admin"
 * or "admin" (full bypass), or if `req.user.permissions` contains at least one of
 * the listed permissions.
 *
 * Must be used after `authenticateJWT` so that `req.user` is populated.
 *
 * @example
 * export const POST = async (req, res) => {
 *   requirePermission("project:create")(req, res, async () => { ... })
 * }
 */
export function requirePermission(...permissions: string[]) {
  return (req: any, res: Response, next: NextFunction) => {
    const userRoles: string[] = req.user?.roles ?? []
    if (userRoles.includes("super-admin") || userRoles.includes("admin")) return next()
    const userPermissions: string[] = req.user?.permissions ?? []
    if (permissions.some((p) => userPermissions.includes(p))) return next()
    res.status(403).json({ error: { message: "Forbidden — insufficient permissions" } })
  }
}

/**
 * Workspace isolation guard — rejects requests where the `workspace_id` query
 * param, body field, or URL path param (:id on /workspaces/:id sub-routes)
 * does not match the authenticated user's workspace.
 *
 * **WARNING:** This guard is currently inert because JWTs are always issued
 * with `workspaceId: null` (multi-workspace users don't have a single
 * workspace in their token). Workspace isolation is enforced per-route
 * via `assertWorkspaceAccess` helpers instead. This function is kept for
 * backwards compatibility but should not be relied upon.
 *
 * @deprecated Use per-route `assertWorkspaceAccess` instead.
 */
export function requireWorkspace(req: any, res: Response, next: NextFunction) {
  // Check explicit workspace_id in query / body
  const queryOrBodyId = (req.query?.workspace_id ?? req.body?.workspace_id) as string | undefined
  // Check path param only on /admin/workspaces/:id sub-routes to avoid
  // accidentally treating project/issue :id params as workspace IDs.
  const isWorkspacePath = /\/workspaces\/[^/]/.test(req.path ?? req.url ?? "")
  const paramId = isWorkspacePath ? (req.params?.workspaceId ?? req.params?.id) as string | undefined : undefined

  const requestedId = queryOrBodyId ?? paramId
  if (requestedId && req.user?.workspaceId && req.user.workspaceId !== requestedId) {
    return res.status(403).json({ error: { message: "Forbidden — wrong workspace" } })
  }
  next()
}
