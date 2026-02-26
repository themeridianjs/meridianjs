import type { Response } from "express"
import { requirePermission } from "@meridianjs/auth"

export const GET = async (req: any, res: Response) => {
  const appRoleService = req.scope.resolve("appRoleModuleService") as any
  const role = await appRoleService.retrieveAppRole(req.params.id)
  res.json({ role })
}

export const PUT = async (req: any, res: Response) => {
  requirePermission("role:update")(req, res, async () => {
    const appRoleService = req.scope.resolve("appRoleModuleService") as any
    const { name, description, permissions } = req.body
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description
    if (permissions !== undefined) updates.permissions = Array.isArray(permissions) ? permissions : []

    const role = await appRoleService.updateAppRole(req.params.id, updates)
    res.json({ role })
  })
}

export const DELETE = async (req: any, res: Response) => {
  requirePermission("role:delete")(req, res, async () => {
    const appRoleService = req.scope.resolve("appRoleModuleService") as any
    const role = await appRoleService.retrieveAppRole(req.params.id)

    if (role.is_system) {
      res.status(400).json({ error: { message: "Cannot delete a system role" } })
      return
    }

    await appRoleService.deleteAppRole(req.params.id)
    res.status(204).send()
  })
}
