import type { Response } from "express"
import { requirePermission } from "@meridianjs/auth"

export const DELETE = async (req: any, res: Response) => {
  requirePermission("team:manage_members")(req, res, async () => {
    const teamMemberService = req.scope.resolve("teamMemberModuleService") as any
    await teamMemberService.removeByTeamAndUser(req.params.teamId, req.params.userId)
    res.status(204).send()
  })
}
