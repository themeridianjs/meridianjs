import type { Response, NextFunction } from "express"
import { requireRoles } from "@meridianjs/auth"

export const GET = async (req: any, res: Response, next: NextFunction) => {
  requireRoles("admin", "super-admin")(req, res, async () => {
    try {
      const userService = req.scope.resolve("userModuleService") as any
      const limit = Math.min(Number(req.query.limit) || 20, 100)
      const offset = Number(req.query.offset) || 0
      const [users, count] = await userService.listAndCountUsers({}, { limit, offset })
      const safeUsers = (users as any[]).map(({ password_hash: _, ...u }) => u)
      res.json({ users: safeUsers, count, limit, offset })
    } catch (err) {
      next(err)
    }
  })
}
