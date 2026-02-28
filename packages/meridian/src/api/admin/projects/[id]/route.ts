import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"
import { hasProjectAccess } from "../../../utils/project-access.js"

export const GET = async (req: any, res: Response) => {
  const projectService = req.scope.resolve("projectModuleService") as any
  const project = await projectService.retrieveProject(req.params.id).catch(() => null)
  if (!project) { res.status(404).json({ error: { message: "Project not found" } }); return }

  if (!await hasProjectAccess(req, project)) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }

  res.json({ project })
}

export const PUT = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("project:update")(req, res, async () => {
    try {
      const projectService = req.scope.resolve("projectModuleService") as any
      const activityService = req.scope.resolve("activityModuleService") as any
      const { name, description, status, visibility, icon, color, metadata } = req.body
      const updates: Record<string, unknown> = {}
      if (name !== undefined) updates.name = name
      if (description !== undefined) updates.description = description
      if (status !== undefined) updates.status = status
      if (visibility !== undefined) updates.visibility = visibility
      if (icon !== undefined) updates.icon = icon
      if (color !== undefined) updates.color = color
      if (metadata !== undefined) updates.metadata = metadata
      const project = await projectService.updateProject(req.params.id, updates)
      await activityService.recordActivity({
        entity_type: "project", entity_id: req.params.id,
        actor_id: req.user?.id ?? "system", action: "updated", workspace_id: project.workspace_id,
        changes: Object.fromEntries(Object.keys(updates).map(k => [k, { to: updates[k] }])),
      }).catch(() => {})
      res.json({ project })
    } catch (err) {
      next(err)
    }
  })
}

export const DELETE = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("project:delete")(req, res, async () => {
    try {
      const projectService = req.scope.resolve("projectModuleService") as any
      await projectService.deleteProject(req.params.id)
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  })
}
