import type { Response, NextFunction } from "express"
import { requireRoles } from "@meridianjs/auth"

const ROLE_RANK: Record<string, number> = {
  "super-admin": 3,
  "admin": 2,
  "moderator": 1,
  "member": 0,
}

function actorRank(req: any): number {
  const roles: string[] = req.user?.roles ?? []
  return Math.max(...roles.map((r) => ROLE_RANK[r] ?? 0), 0)
}

/** DELETE /admin/users/:id/sessions — revoke all active sessions for a user (admin action). */
export const DELETE = async (req: any, res: Response, next: NextFunction) => {
  requireRoles("super-admin", "admin")(req, res, async () => {
    try {
      const userService = req.scope.resolve("userModuleService") as any
      const target = await userService.retrieveUser(req.params.id)

      if (!target) {
        res.status(404).json({ error: { message: "User not found" } })
        return
      }

      const tRank = ROLE_RANK[target.role] ?? 0
      if (tRank >= actorRank(req)) {
        res.status(403).json({ error: { message: "You cannot revoke sessions of a user at or above your level" } })
        return
      }

      await userService.revokeAllUserSessions(req.params.id)
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  })
}
