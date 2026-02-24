import type { Response } from "express"

export const DELETE = async (req: any, res: Response) => {
  const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
  await projectMemberService.removeProjectTeam(req.params.id, req.params.teamId)
  res.status(204).send()
}
