import type { Response } from "express"
import { hasProjectAccess } from "../../../../utils/project-access.js"

export const GET = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const issue = await issueService.retrieveIssue(req.params.id).catch(() => null)
  if (!issue) {
    res.status(404).json({ error: { message: "Issue not found" } })
    return
  }
  if (issue.project_id) {
    const projectService = req.scope.resolve("projectModuleService") as any
    const project = await projectService.retrieveProject(issue.project_id).catch(() => null)
    if (project && !await hasProjectAccess(req, project)) {
      res.status(403).json({ error: { message: "Forbidden" } })
      return
    }
  }
  const activityService = req.scope.resolve("activityModuleService") as any
  const activities = await activityService.listActivityForEntity("issue", req.params.id)
  activities.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  res.json({ activities })
}
