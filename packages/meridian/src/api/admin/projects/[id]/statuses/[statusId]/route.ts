import type { Response } from "express"

export const PUT = async (req: any, res: Response) => {
  const { name, color, category, metadata } = req.body
  const svc = req.scope.resolve("projectModuleService") as any
  const payload: Record<string, unknown> = {}
  if (name !== undefined) payload.name = name
  if (color !== undefined) payload.color = color
  if (category !== undefined) payload.category = category
  if (metadata !== undefined) payload.metadata = metadata
  const updated = await svc.updateProjectStatus(req.params.statusId, payload)
  res.json({ status: updated })
}

export const DELETE = async (req: any, res: Response) => {
  const svc = req.scope.resolve("projectModuleService") as any
  const issueSvc = req.scope.resolve("issueModuleService") as any
  const statuses = await svc.listStatusesByProject(req.params.id)
  const target = statuses.find((s: any) => s.id === req.params.statusId)
  if (!target) { res.status(404).json({ error: { message: "Status not found" } }); return }
  const [, count] = await issueSvc.listAndCountIssues({ project_id: req.params.id, status: target.key }, { limit: 1, offset: 0 })
  if (count > 0) {
    res.status(409).json({ error: { message: `Cannot delete status "${target.name}": ${count} issue(s) still use it` } })
    return
  }
  await svc.deleteProjectStatus(req.params.statusId)
  res.status(204).send()
}
