import type { Response } from "express"

export const POST = async (req: any, res: Response) => {
  const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
  const { team_id } = req.body

  if (!team_id) {
    res.status(400).json({ error: { message: "team_id is required" } })
    return
  }

  await projectMemberService.ensureProjectTeam(req.params.id, team_id)
  res.status(201).json({ ok: true })
}
