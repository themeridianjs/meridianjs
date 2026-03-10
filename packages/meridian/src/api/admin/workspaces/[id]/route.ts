import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"

async function assertWorkspaceAccess(req: any, res: Response, workspaceId: string): Promise<boolean> {
  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any

  const workspace = await workspaceService.retrieveWorkspace(workspaceId)
  if (!workspace) {
    res.status(404).json({ error: { message: "Workspace not found" } })
    return false
  }

  const roles: string[] = req.user?.roles ?? []
  const isPrivileged = roles.includes("super-admin") || roles.includes("admin")

  // Private workspaces: always require membership regardless of role
  if (workspace.is_private || !isPrivileged) {
    const membership = await workspaceMemberService.getMembership(workspaceId, req.user?.id)
    if (!membership) {
      res.status(403).json({ error: { message: "Forbidden — not a member of this workspace" } })
      return false
    }
  }

  return true
}

export const GET = async (req: any, res: Response) => {
  if (!await assertWorkspaceAccess(req, res, req.params.id)) return

  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const workspace = await workspaceService.retrieveWorkspace(req.params.id)
  res.json({ workspace })
}

export const PUT = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("workspace:update")(req, res, async () => {
    try {
      if (!await assertWorkspaceAccess(req, res, req.params.id)) return

      const workspaceService = req.scope.resolve("workspaceModuleService") as any
      const { name, logo_url, is_private } = req.body
      const updates: Record<string, unknown> = {}
      if (name !== undefined) updates.name = name.trim()
      if (logo_url !== undefined) updates.logo_url = logo_url
      if (is_private !== undefined) updates.is_private = is_private

      const workspace = await workspaceService.updateWorkspace(req.params.id, updates)
      res.json({ workspace })
    } catch (err) {
      next(err)
    }
  })
}
