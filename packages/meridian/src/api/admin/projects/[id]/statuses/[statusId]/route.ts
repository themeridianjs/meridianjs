import type { Response } from "express"
import { hasProjectAccess } from "../../../../../utils/project-access.js"

export const PUT = async (req: any, res: Response) => {
  const { name, color, category, metadata } = req.body
  const svc = req.scope.resolve("projectModuleService") as any
  const activityService = req.scope.resolve("activityModuleService") as any
  const project = await svc.retrieveProject(req.params.id).catch(() => null)
  if (!project) { res.status(404).json({ error: { message: "Project not found" } }); return }
  if (!await hasProjectAccess(req, project)) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }
  const existing = await svc.retrieveProjectStatus(req.params.statusId).catch(() => null)
  const payload: Record<string, unknown> = {}
  if (name !== undefined) payload.name = name
  if (color !== undefined) payload.color = color
  if (category !== undefined) payload.category = category
  if (metadata !== undefined) payload.metadata = metadata
  // Snapshot old values before update — MikroORM identity map means `existing`
  // and the returned entity share the same object reference, so reading from
  // `existing` after the update would yield the new values.
  const oldValues: Record<string, unknown> = {}
  if (existing) {
    for (const key of Object.keys(payload)) {
      oldValues[key] = (existing as any)[key]
    }
  }
  const updated = await svc.updateProjectStatus(req.params.statusId, payload)
  if (existing) {
    const changes: Record<string, { from: unknown; to: unknown }> = {}
    for (const key of Object.keys(payload)) {
      changes[key] = { from: oldValues[key], to: payload[key] }
    }
    activityService.recordActivity({
      entity_type: "project", entity_id: req.params.id,
      actor_id: req.user?.id ?? "system", action: "status_updated",
      workspace_id: project.workspace_id, changes,
    }).catch(() => {})
  }
  res.json({ status: updated })
}

export const DELETE = async (req: any, res: Response) => {
  const svc = req.scope.resolve("projectModuleService") as any
  const issueSvc = req.scope.resolve("issueModuleService") as any
  const activityService = req.scope.resolve("activityModuleService") as any
  const project = await svc.retrieveProject(req.params.id).catch(() => null)
  if (!project) { res.status(404).json({ error: { message: "Project not found" } }); return }
  if (!await hasProjectAccess(req, project)) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }
  const statuses = await svc.listStatusesByProject(req.params.id)
  const target = statuses.find((s: any) => s.id === req.params.statusId)
  if (!target) { res.status(404).json({ error: { message: "Status not found" } }); return }
  const [, count] = await issueSvc.listAndCountIssues({ project_id: req.params.id, status: target.key }, { limit: 1, offset: 0 })
  if (count > 0) {
    res.status(409).json({ error: { message: `Cannot delete status "${target.name}": ${count} issue(s) still use it` } })
    return
  }
  await svc.deleteProjectStatus(req.params.statusId)
  activityService.recordActivity({
    entity_type: "project", entity_id: req.params.id,
    actor_id: req.user?.id ?? "system", action: "status_deleted",
    workspace_id: project.workspace_id,
    changes: { name: { from: target.name, to: null }, key: { from: target.key, to: null } },
  }).catch(() => {})
  res.status(204).send()
}
