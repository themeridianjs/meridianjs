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

async function targetRank(req: any): Promise<number> {
  const userService = req.scope.resolve("userModuleService") as any
  const target = await userService.retrieveUser(req.params.id)
  return ROLE_RANK[target.role] ?? 0
}

export const PATCH = async (req: any, res: Response, next: NextFunction) => {
  requireRoles("super-admin", "admin")(req, res, async () => {
    try {
      const actor = actorRank(req)
      const target = await targetRank(req)

      if (target >= actor) {
        res.status(403).json({ error: { message: "You cannot change the role of a user at or above your level" } })
        return
      }

      const { role } = req.body
      const allowed = ["super-admin", "admin", "moderator", "member"]
      if (!allowed.includes(role)) {
        res.status(400).json({ error: { message: `Invalid role. Must be one of: ${allowed.join(", ")}` } })
        return
      }

      // Cannot promote someone to your level or above
      if ((ROLE_RANK[role] ?? 0) >= actor) {
        res.status(403).json({ error: { message: "You cannot assign a role equal to or above your own" } })
        return
      }

      const userService = req.scope.resolve("userModuleService") as any
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
  requireRoles("super-admin", "admin")(req, res, async () => {
    try {
      const actor = actorRank(req)
      const target = await targetRank(req)

      if (target >= actor) {
        res.status(403).json({ error: { message: "You cannot delete a user at or above your level" } })
        return
      }

      if (req.params.id === req.user?.id) {
        res.status(400).json({ error: { message: "You cannot delete yourself" } })
        return
      }

      const userService = req.scope.resolve("userModuleService") as any
      await userService.softDeleteUser(req.params.id)
      await userService.revokeAllUserSessions(req.params.id).catch(() => {})
      res.json({ success: true })
    } catch (err) {
      next(err)
    }
  })
}
