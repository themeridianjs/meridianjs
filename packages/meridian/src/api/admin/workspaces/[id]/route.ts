import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"
import { assertWorkspaceAccess } from "../../../utils/workspace-access.js"

export const GET = async (req: any, res: Response) => {
  if (!await assertWorkspaceAccess(req, res)) return

  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const workspace = await workspaceService.retrieveWorkspace(req.params.id)
  res.json({ workspace })
}

export const PUT = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("workspace:update")(req, res, async () => {
    try {
      if (!await assertWorkspaceAccess(req, res)) return

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
