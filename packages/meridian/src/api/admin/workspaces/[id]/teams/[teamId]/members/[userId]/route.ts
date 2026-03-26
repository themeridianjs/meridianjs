import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"
import { assertWorkspaceAccess } from "../../../../../../../utils/workspace-access.js"

async function assertTeamBelongsToWorkspace(req: any, res: Response): Promise<boolean> {
  const userService = req.scope.resolve("userModuleService") as any
  const team = await userService.retrieveTeam(req.params.teamId)
  if (!team || team.workspace_id !== req.params.id) {
    res.status(404).json({ error: { message: "Team not found in this workspace" } })
    return false
  }
  return true
}

export const DELETE = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("team:manage_members")(req, res, async () => {
    try {
      if (!await assertWorkspaceAccess(req, res)) return
      if (!await assertTeamBelongsToWorkspace(req, res)) return

      const teamMemberService = req.scope.resolve("teamMemberModuleService") as any
      await teamMemberService.removeByTeamAndUser(req.params.teamId, req.params.userId)
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  })
}
