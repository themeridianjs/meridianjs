import type { Response, NextFunction } from "express"
import { requireRoles } from "@meridianjs/auth"

export const PATCH = async (req: any, res: Response, next: NextFunction) => {
  requireRoles("super-admin")(req, res, async () => {
    try {
      const userService = req.scope.resolve("userModuleService") as any
      const { role } = req.body
      const allowed = ["super-admin", "admin", "member"]
      if (!allowed.includes(role)) {
        res.status(400).json({ error: { message: `Invalid role. Must be one of: ${allowed.join(", ")}` } })
        return
      }
      const user = await userService.updateUser(req.params.id, { role })
      await userService.revokeAllUserSessions(req.params.id).catch(() => {})
      const { password_hash: _, ...safe } = user as any
      res.json({ user: safe })
    } catch (err) {
      next(err)
    }
  })
}

export const DELETE = async (req: any, res: Response, next: NextFunction) => {
  requireRoles("super-admin")(req, res, async () => {
    try {
      const userService = req.scope.resolve("userModuleService") as any
      await userService.softDeleteUser(req.params.id)
      // Immediately invalidate all active sessions so the user is logged out
      await userService.revokeAllUserSessions(req.params.id).catch(() => {})
      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  })
}
