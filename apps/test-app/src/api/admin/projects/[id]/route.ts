import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const projectService = req.scope.resolve("projectModuleService") as any
  const project = await projectService.retrieveProject(req.params.id)
  res.json({ project })
}

export const PUT = async (req: any, res: Response) => {
  const projectService = req.scope.resolve("projectModuleService") as any
  const activityService = req.scope.resolve("activityModuleService") as any

  const { name, description, status, visibility, icon, color } = req.body
  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (description !== undefined) updates.description = description
  if (status !== undefined) updates.status = status
  if (visibility !== undefined) updates.visibility = visibility
  if (icon !== undefined) updates.icon = icon
  if (color !== undefined) updates.color = color

  const project = await projectService.updateProject(req.params.id, updates)

  await activityService.recordActivity({
    entity_type: "project",
    entity_id: req.params.id,
    actor_id: req.user?.id ?? "system",
    action: "updated",
    workspace_id: project.workspace_id,
    changes: Object.fromEntries(Object.keys(updates).map(k => [k, { to: updates[k] }])),
  }).catch(() => {})

  res.json({ project })
}

export const DELETE = async (req: any, res: Response) => {
  const projectService = req.scope.resolve("projectModuleService") as any
  await projectService.deleteProject(req.params.id)
  res.status(204).send()
}
