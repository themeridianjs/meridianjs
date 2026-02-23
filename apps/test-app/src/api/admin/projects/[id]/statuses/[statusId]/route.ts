import type { Response } from "express"

export const PUT = async (req: any, res: Response) => {
  const { statusId } = req.params
  const { name, color, category } = req.body

  const svc = req.scope.resolve("projectModuleService") as any
  const updated = await svc.updateProjectStatus(statusId, { name, color, category })
  res.json({ status: updated })
}

export const DELETE = async (req: any, res: Response) => {
  const { id: projectId, statusId } = req.params

  const svc = req.scope.resolve("projectModuleService") as any
  const issueSvc = req.scope.resolve("issueModuleService") as any

  // Fetch the status to get its key
  const statuses = await svc.listStatusesByProject(projectId)
  const target = statuses.find((s: any) => s.id === statusId)
  if (!target) {
    res.status(404).json({ error: { message: "Status not found" } })
    return
  }

  // Reject if any issues still use this key
  const [, count] = await issueSvc.listAndCountIssues({ project_id: projectId, status: target.key }, { limit: 1, offset: 0 })
  if (count > 0) {
    res.status(409).json({ error: { message: `Cannot delete status "${target.name}": ${count} issue(s) still use it` } })
    return
  }

  await svc.deleteProjectStatus(statusId)
  res.status(204).send()
}
