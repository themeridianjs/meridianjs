import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"
import { completeSprintWorkflow } from "../../../../workflows/complete-sprint.js"
import { hasProjectAccess } from "../../../utils/project-access.js"

export const GET = async (req: any, res: Response) => {
  const sprintService = req.scope.resolve("sprintModuleService") as any
  const sprint = await sprintService.retrieveSprint(req.params.id)
  if (sprint?.project_id) {
    const projectService = req.scope.resolve("projectModuleService") as any
    const project = await projectService.retrieveProject(sprint.project_id).catch(() => null)
    if (project && !await hasProjectAccess(req, project)) {
      res.status(403).json({ error: { message: "Forbidden" } })
      return
    }
  }
  res.json({ sprint })
}

export const PUT = async (req: any, res: Response, next: NextFunction) => {
  const { status } = req.body

  // Sprint start/complete require specific permissions checked inside the handler
  if (status === "active") {
    requirePermission("sprint:start")(req, res, async () => {
      try {
        const sprintService = req.scope.resolve("sprintModuleService") as any
        const sprint = await sprintService.updateSprint(req.params.id, { status: "active" })
        res.json({ sprint })
      } catch (err) {
        next(err)
      }
    })
    return
  }

  if (status === "completed") {
    requirePermission("sprint:complete")(req, res, async () => {
      try {
        const { result: sprint, errors, transaction_status } = await completeSprintWorkflow(req.scope).run({
          input: { sprintId: req.params.id, moveIncompleteToSprintId: req.body.moveIncompleteToSprintId ?? null, actor_id: req.user?.id ?? null },
        })
        if (transaction_status === "reverted") {
          const err = errors[0]
          res.status((err as any).status ?? 500).json({ error: { message: err.message } })
          return
        }
        res.json({ sprint })
      } catch (err) {
        next(err)
      }
    })
    return
  }

  // Non-status updates (name, goal, dates, metadata) — require sprint:update permission
  requirePermission("sprint:update")(req, res, async () => {
    try {
      const sprintService = req.scope.resolve("sprintModuleService") as any
      const { name, goal, start_date, end_date, metadata } = req.body
      const updates: Record<string, unknown> = {}
      if (name !== undefined) updates.name = name
      if (goal !== undefined) updates.goal = goal
      if (start_date !== undefined) updates.start_date = new Date(start_date)
      if (end_date !== undefined) updates.end_date = new Date(end_date)
      // status is intentionally excluded — status changes go through dedicated branches above
      if (metadata !== undefined) updates.metadata = metadata
      const sprint = await sprintService.updateSprint(req.params.id, updates)
      res.json({ sprint })
    } catch (err) {
      next(err)
    }
  })
}

export const DELETE = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("sprint:delete")(req, res, async () => {
    try {
      const sprintService = req.scope.resolve("sprintModuleService") as any
      await sprintService.deleteSprint(req.params.id)
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  })
}
