import type { Response, NextFunction } from "express"
import { requireRoles } from "@meridianjs/auth"

export const POST = async (req: any, res: Response, next: NextFunction) => {
  requireRoles("super-admin", "admin")(req, res, async () => {
    try {
      const userService = req.scope.resolve("userModuleService") as any
      const user = await userService.reactivateUser(req.params.id)
      const { password_hash: _, ...safe } = user as any
      res.json({ user: safe })
    } catch (err) {
      next(err)
    }
  })
}
