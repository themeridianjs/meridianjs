import type { Response } from "express"
import { hasProjectAccess } from "../../../../../utils/project-access.js"

export const GET = async (req: any, res: Response) => {
  const svc = req.scope.resolve("projectModuleService") as any
  const project = await svc.retrieveProject(req.params.id).catch(() => null)
  if (!project) { res.status(404).json({ error: { message: "Project not found" } }); return }
  if (!await hasProjectAccess(req, project)) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }
  const raw = await svc.retrieveProjectHealthUpdate(req.params.updateId).catch(() => null)
  if (!raw) { res.status(404).json({ error: { message: "Health update not found" } }); return }
  const update = { ...raw, collaborators: raw.collaborators ? JSON.parse(raw.collaborators) : [] }
  res.json({ update })
}

export const PUT = async (req: any, res: Response) => {
  const { health, title, summary, collaborators, report_date } = req.body
  const svc = req.scope.resolve("projectModuleService") as any
  const activityService = req.scope.resolve("activityModuleService") as any
  const project = await svc.retrieveProject(req.params.id).catch(() => null)
  if (!project) { res.status(404).json({ error: { message: "Project not found" } }); return }
  if (!await hasProjectAccess(req, project)) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }
  const existing = await svc.retrieveProjectHealthUpdate(req.params.updateId).catch(() => null)
  if (!existing) { res.status(404).json({ error: { message: "Health update not found" } }); return }

  const payload: Record<string, unknown> = {}
  if (health !== undefined) payload.health = health
  if (title !== undefined) payload.title = title
  if (summary !== undefined) payload.summary = summary
  if (report_date !== undefined) payload.report_date = report_date
  if (collaborators !== undefined) payload.collaborators = JSON.stringify(Array.isArray(collaborators) ? collaborators : [])

  // Snapshot old values before update — MikroORM identity map shares object references
  const oldValues: Record<string, unknown> = {}
  for (const key of Object.keys(payload)) {
    oldValues[key] = (existing as any)[key]
  }

  const raw = await svc.updateProjectHealthUpdate(req.params.updateId, payload)
  const updated = { ...raw, collaborators: raw.collaborators ? JSON.parse(raw.collaborators) : [] }

  const changes: Record<string, { from: unknown; to: unknown }> = {}
  for (const key of Object.keys(payload)) {
    if (key !== "collaborators") changes[key] = { from: oldValues[key], to: payload[key] }
  }
  activityService.recordActivity({
    entity_type: "project", entity_id: req.params.id,
    actor_id: req.user?.id ?? "system", action: "health_update_updated",
    workspace_id: project.workspace_id, changes,
  }).catch(() => {})

  res.json({ update: updated })
}

export const DELETE = async (req: any, res: Response) => {
  const svc = req.scope.resolve("projectModuleService") as any
  const activityService = req.scope.resolve("activityModuleService") as any
  const project = await svc.retrieveProject(req.params.id).catch(() => null)
  if (!project) { res.status(404).json({ error: { message: "Project not found" } }); return }
  if (!await hasProjectAccess(req, project)) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }
  const existing = await svc.retrieveProjectHealthUpdate(req.params.updateId).catch(() => null)
  if (!existing) { res.status(404).json({ error: { message: "Health update not found" } }); return }

  await svc.deleteProjectHealthUpdate(req.params.updateId)

  activityService.recordActivity({
    entity_type: "project", entity_id: req.params.id,
    actor_id: req.user?.id ?? "system", action: "health_update_deleted",
    workspace_id: project.workspace_id,
    changes: {
      title: { from: existing.title, to: null },
      health: { from: existing.health, to: null },
    },
  }).catch(() => {})

  res.status(204).send()
}
