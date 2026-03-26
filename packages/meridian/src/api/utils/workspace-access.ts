import type { Response } from "express"

/**
 * Shared workspace access check. Verifies the workspace exists and the caller
 * has access (public workspace for admins, or membership for private/members).
 */
export async function assertWorkspaceAccess(req: any, res: Response): Promise<boolean> {
  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any

  const workspace = await workspaceService.retrieveWorkspace(req.params.id).catch(() => null)
  if (!workspace) {
    res.status(404).json({ error: { message: "Workspace not found" } })
    return false
  }

  const roles: string[] = req.user?.roles ?? []
  const isPrivileged = roles.includes("super-admin") || roles.includes("admin")

  if (workspace.is_private || !isPrivileged) {
    const membership = await workspaceMemberService.getMembership(req.params.id, req.user?.id)
    if (!membership) {
      res.status(403).json({ error: { message: "Forbidden — not a member of this workspace" } })
      return false
    }
  }
  return true
}

/**
 * Stricter workspace access check — requires workspace admin role (not just member).
 */
export async function assertWorkspaceAdmin(req: any, res: Response): Promise<boolean> {
  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any

  const workspace = await workspaceService.retrieveWorkspace(req.params.id).catch(() => null)
  if (!workspace) {
    res.status(404).json({ error: { message: "Workspace not found" } })
    return false
  }

  const roles: string[] = req.user?.roles ?? []
  const isGlobalAdmin = roles.includes("super-admin") || roles.includes("admin")
  if (isGlobalAdmin) return true

  const membership = await workspaceMemberService.getMembership(req.params.id, req.user?.id)
  if (!membership || membership.role !== "admin") {
    res.status(403).json({ error: { message: "Workspace admin access required" } })
    return false
  }
  return true
}

export function isSuperAdminOrgScope(req: any): boolean {
  const roles: string[] = req.user?.roles ?? []
  return roles.includes("super-admin") && req.query.org_scope === "true"
}

/**
 * Returns workspace IDs the caller can access (public + private where member).
 * If wsIdHints are provided, only those workspaces are checked; otherwise all are fetched.
 */
export async function getAccessibleWorkspaceIds(req: any, wsIdHints?: string[]): Promise<string[]> {
  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
  const userId: string = req.user?.id

  let workspaces: any[]
  if (wsIdHints && wsIdHints.length > 0) {
    const [ws] = await workspaceService.listAndCountWorkspaces(
      { id: wsIdHints.length === 1 ? wsIdHints[0] : wsIdHints },
      { limit: wsIdHints.length }
    )
    workspaces = ws
  } else {
    const [all] = await workspaceService.listAndCountWorkspaces({}, { limit: 1000 })
    workspaces = all
  }

  const memberWsIds = new Set<string>(await workspaceMemberService.getWorkspaceIdsForUser(userId))
  return workspaces
    .filter((ws: any) => !ws.is_private || memberWsIds.has(ws.id))
    .map((ws: any) => ws.id)
}
