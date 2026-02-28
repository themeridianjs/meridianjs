import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"

export const PATCH = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("member:update_role")(req, res, async () => {
    try {
      const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
      const { role } = req.body

      if (!role || !["admin", "member"].includes(role)) {
        res.status(400).json({ error: { message: "role must be 'admin' or 'member'" } })
        return
      }

      const membership = await workspaceMemberService.getMembership(req.params.id, req.params.userId)
      if (!membership) {
        res.status(404).json({ error: { message: "Member not found" } })
        return
      }

      const updated = await workspaceMemberService.updateWorkspaceMember(membership.id, { role })
      res.json({ member: updated })
    } catch (err) {
      next(err)
    }
  })
}

export const DELETE = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("member:remove")(req, res, async () => {
    try {
      const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any

      const membership = await workspaceMemberService.getMembership(req.params.id, req.params.userId)
      if (!membership) {
        res.status(404).json({ error: { message: "Member not found" } })
        return
      }

      await workspaceMemberService.deleteWorkspaceMember(membership.id)
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  })
}
