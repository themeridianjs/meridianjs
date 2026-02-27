import type { Response } from "express"
import { requirePermission } from "@meridianjs/auth"
import { hasProjectAccess } from "../../utils/project-access.js"

export const GET = async (req: any, res: Response) => {
  const sprintService = req.scope.resolve("sprintModuleService") as any
  const filters: Record<string, unknown> = {}
  if (req.query.project_id) filters.project_id = req.query.project_id
  if (req.query.status) filters.status = req.query.status

  if (req.query.project_id) {
    const projectService = req.scope.resolve("projectModuleService") as any
    const project = await projectService.retrieveProject(req.query.project_id).catch(() => null)
    if (!project) { res.status(404).json({ error: { message: "Project not found" } }); return }
    if (!await hasProjectAccess(req, project)) {
      res.status(403).json({ error: { message: "Forbidden" } })
      return
    }
  }

  const [sprints, count] = await sprintService.listAndCountSprints(filters)
  res.json({ sprints, count })
}

export const POST = async (req: any, res: Response) => {
  requirePermission("sprint:create")(req, res, async () => {
    const sprintService = req.scope.resolve("sprintModuleService") as any
    const { name, goal, project_id, start_date, end_date, metadata } = req.body
    if (!name || !project_id) { res.status(400).json({ error: { message: "name and project_id are required" } }); return }
    const sprint = await sprintService.createSprint({
      name, goal: goal ?? null, project_id, status: "planned",
      start_date: start_date ? new Date(start_date) : null,
      end_date: end_date ? new Date(end_date) : null,
      metadata: metadata ?? null,
    })
    res.status(201).json({ sprint })
  })
}
