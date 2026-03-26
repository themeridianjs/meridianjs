import type { Response } from "express"

const VALID_HEALTH = ["on_track", "delayed", "on_hold", "completed"]

export const GET = async (req: any, res: Response) => {
  const svc = req.scope.resolve("projectModuleService") as any
  const project = await svc.retrieveProject(req.params.id).catch(() => null)
  if (!project) { res.status(404).json({ error: { message: "Project not found" } }); return }
  const raw = await svc.listHealthUpdatesByProject(req.params.id)
  const updates = raw.map((u: any) => ({ ...u, collaborators: u.collaborators ? JSON.parse(u.collaborators) : [] }))
  res.json({ updates })
}

export const POST = async (req: any, res: Response) => {
  const { health, title, summary, collaborators, report_date } = req.body
  if (!health || !title) {
    res.status(400).json({ error: { message: "health and title are required" } })
    return
  }
  if (!VALID_HEALTH.includes(health)) {
    res.status(400).json({ error: { message: `health must be one of: ${VALID_HEALTH.join(", ")}` } })
    return
  }
  const svc = req.scope.resolve("projectModuleService") as any
  const project = await svc.retrieveProject(req.params.id).catch(() => null)
  if (!project) { res.status(404).json({ error: { message: "Project not found" } }); return }
  const raw = await svc.createHealthUpdate({
    project_id: req.params.id,
    health,
    title,
    summary: summary ?? null,
    report_date: report_date ?? null,
    created_by: req.user?.id ?? null,
    collaborators: JSON.stringify(Array.isArray(collaborators) ? collaborators : []),
  })
  const update = { ...raw, collaborators: raw.collaborators ? JSON.parse(raw.collaborators) : [] }
  res.status(201).json({ update })
}
