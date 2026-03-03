import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const projectService = req.scope.resolve("projectModuleService") as any
  const project = await projectService.retrieveProjectByShareToken(req.params.token)
  if (!project) {
    res.status(404).json({ error: { message: "Share link not found or expired" } })
    return
  }

  const statuses = await projectService.listStatusesByProject(project.id)

  res.json({
    project: {
      id: project.id,
      name: project.name,
      identifier: project.identifier,
      description: project.description,
      icon: project.icon,
      color: project.color,
      statuses,
    },
  })
}
