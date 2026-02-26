import type { Response } from "express"
import { requirePermission } from "@meridianjs/auth"

export const GET = async (req: any, res: Response) => {
  const appRoleService = req.scope.resolve("appRoleModuleService") as any
  const [roles, count] = await appRoleService.listAndCountAppRoles({}, { limit: 100 })
  res.json({ roles, count })
}

export const POST = async (req: any, res: Response) => {
  requirePermission("role:create")(req, res, async () => {
    const appRoleService = req.scope.resolve("appRoleModuleService") as any
    const { name, description, permissions } = req.body

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: { message: "name is required" } })
      return
    }

    const role = await appRoleService.createAppRole({
      name: name.trim(),
      description: description ?? null,
      is_system: false,
      permissions: Array.isArray(permissions) ? permissions : [],
    })
    res.status(201).json({ role })
  })
}
