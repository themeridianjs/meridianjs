import type { Response } from "express"
import { hasProjectAccess } from "../../../../../utils/project-access.js"

export const POST = async (req: any, res: Response) => {
  const { orderedIds } = req.body
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    res.status(400).json({ error: { message: "orderedIds must be a non-empty array" } })
    return
  }
  const svc = req.scope.resolve("projectModuleService") as any
  const project = await svc.retrieveProject(req.params.id).catch(() => null)
  if (!project) { res.status(404).json({ error: { message: "Project not found" } }); return }
  if (!await hasProjectAccess(req, project)) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }
  await svc.reorderStatuses(req.params.id, orderedIds)
  res.status(204).send()
}
