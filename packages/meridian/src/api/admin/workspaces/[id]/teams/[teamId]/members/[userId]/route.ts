import type { Response } from "express"

export const DELETE = async (req: any, res: Response) => {
  const teamMemberService = req.scope.resolve("teamMemberModuleService") as any
  await teamMemberService.removeByTeamAndUser(req.params.teamId, req.params.userId)
  res.status(204).send()
}
