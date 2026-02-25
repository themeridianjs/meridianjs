import type { Response } from "express"

export const POST = async (req: any, res: Response) => {
  const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
  const projectService = req.scope.resolve("projectModuleService") as any
  const { team_id } = req.body

  if (!team_id) {
    res.status(400).json({ error: { message: "team_id is required" } })
    return
  }

  const projectRef = req.params.id
  const project =
    (await projectService.retrieveProject(projectRef).catch(() => null)) ??
    (await projectService.retrieveProjectByIdentifier?.(projectRef).catch(() => null))
  if (!project) {
    res.status(404).json({ error: { message: `Project "${projectRef}" not found` } })
    return
  }

  await projectMemberService.ensureProjectTeam(project.id, team_id)
  res.status(201).json({ ok: true })
}
