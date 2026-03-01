import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"

export const GET = async (req: any, res: Response) => {
  const roles: string[] = req.user?.roles ?? []
  const isPrivileged = roles.includes("super-admin") || roles.includes("admin")

  if (!isPrivileged) {
    const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
    const membership = await workspaceMemberService.getMembership(req.params.id, req.user?.id)
    if (!membership) {
      res.status(403).json({ error: { message: "Forbidden — not a member of this workspace" } })
      return
    }
  }

  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const workspace = await workspaceService.retrieveWorkspace(req.params.id)
  res.json({ workspace })
}

export const PUT = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("workspace:update")(req, res, async () => {
    try {
      const workspaceService = req.scope.resolve("workspaceModuleService") as any
      const { name, logo_url } = req.body
      const updates: Record<string, unknown> = {}
      if (name !== undefined) updates.name = name.trim()
      if (logo_url !== undefined) updates.logo_url = logo_url

      const workspace = await workspaceService.updateWorkspace(req.params.id, updates)
      res.json({ workspace })
    } catch (err) {
      next(err)
    }
  })
}
