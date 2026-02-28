import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"

export const DELETE = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("team:manage_members")(req, res, async () => {
    try {
      const teamMemberService = req.scope.resolve("teamMemberModuleService") as any
      await teamMemberService.removeByTeamAndUser(req.params.teamId, req.params.userId)
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  })
}
