import type { Response } from "express"
import { requirePermission } from "@meridianjs/auth"

export const GET = async (req: any, res: Response) => {
  const sprintService = req.scope.resolve("sprintModuleService") as any
  const filters: Record<string, unknown> = {}
  if (req.query.project_id) filters.project_id = req.query.project_id
  if (req.query.status) filters.status = req.query.status
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
