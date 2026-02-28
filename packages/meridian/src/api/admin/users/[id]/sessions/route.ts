import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"

/** DELETE /admin/users/:id/sessions — revoke all active sessions for a user (admin action). */
export const DELETE = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("member:remove")(req, res, async () => {
    try {
      const userService = req.scope.resolve("userModuleService") as any
      await userService.revokeAllUserSessions(req.params.id)
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  })
}
