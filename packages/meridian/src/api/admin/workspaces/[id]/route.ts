import type { Response } from "express"
import { requirePermission } from "@meridianjs/auth"

export const GET = async (req: any, res: Response) => {
  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const workspace = await workspaceService.retrieveWorkspace(req.params.id)
  res.json({ workspace })
}

export const PUT = async (req: any, res: Response) => {
  requirePermission("workspace:update")(req, res, async () => {
    const workspaceService = req.scope.resolve("workspaceModuleService") as any
    const { name } = req.body
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name.trim()

    const workspace = await workspaceService.updateWorkspace(req.params.id, updates)
    res.json({ workspace })
  })
}
