import type { Response } from "express"
import { hasProjectAccess } from "../../../../utils/project-access.js"

export const GET = async (req: any, res: Response) => {
  const projectService = req.scope.resolve("projectModuleService") as any
  const project = await projectService.retrieveProject(req.params.id).catch(() => null)
  if (!project) { res.status(404).json({ error: { message: "Project not found" } }); return }

  if (!await hasProjectAccess(req, project)) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }

  const activityService = req.scope.resolve("activityModuleService") as any
  const activities = await activityService.listActivityForEntity("project", req.params.id)
  activities.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  res.json({ activities })
}
