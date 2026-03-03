import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const projectService = req.scope.resolve("projectModuleService") as any
  const sprintService = req.scope.resolve("sprintModuleService") as any

  const project = await projectService.retrieveProjectByShareToken(req.params.token)
  if (!project) {
    res.status(404).json({ error: { message: "Share link not found or expired" } })
    return
  }

  const [sprints] = await sprintService.listAndCountSprints({ project_id: project.id })
  res.json({ sprints })
}
