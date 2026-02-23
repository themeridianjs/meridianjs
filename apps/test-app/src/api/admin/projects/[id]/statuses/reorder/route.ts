import type { Response } from "express"

export const POST = async (req: any, res: Response) => {
  const { id: projectId } = req.params
  const { orderedIds } = req.body

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    res.status(400).json({ error: { message: "orderedIds must be a non-empty array" } })
    return
  }

  const svc = req.scope.resolve("projectModuleService") as any
  await svc.reorderStatuses(projectId, orderedIds)
  res.status(204).send()
}
