import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"

export const PATCH = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("role:assign")(req, res, async () => {
    try {
      const userService = req.scope.resolve("userModuleService") as any
      const { app_role_id } = req.body

      // Allow null to clear the role assignment
      const updates: Record<string, unknown> = {
        app_role_id: app_role_id ?? null,
      }

      const user = await userService.updateUser(req.params.id, updates)
      res.json({
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          app_role_id: user.app_role_id,
        },
      })
    } catch (err) {
      next(err)
    }
  })
}
