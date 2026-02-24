import type { Response } from "express"
import { completeSprintWorkflow } from "../../../../workflows/complete-sprint.js"

export const GET = async (req: any, res: Response) => {
  const sprintService = req.scope.resolve("sprintModuleService") as any
  const sprint = await sprintService.retrieveSprint(req.params.id)
  res.json({ sprint })
}

export const PUT = async (req: any, res: Response) => {
  const sprintService = req.scope.resolve("sprintModuleService") as any
  const { name, goal, start_date, end_date, status } = req.body
  if (status === "completed") {
    const { result: sprint, errors, transaction_status } = await completeSprintWorkflow(req.scope).run({
      input: { sprintId: req.params.id, moveIncompleteToSprintId: req.body.moveIncompleteToSprintId ?? null, actor_id: req.user?.id ?? null },
    })
    if (transaction_status === "reverted") {
      const err = errors[0]
      res.status((err as any).status ?? 500).json({ error: { message: err.message } })
      return
    }
    res.json({ sprint })
    return
  }
  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (goal !== undefined) updates.goal = goal
  if (start_date !== undefined) updates.start_date = new Date(start_date)
  if (end_date !== undefined) updates.end_date = new Date(end_date)
  if (status !== undefined) updates.status = status
  const sprint = await sprintService.updateSprint(req.params.id, updates)
  res.json({ sprint })
}

export const DELETE = async (req: any, res: Response) => {
  const sprintService = req.scope.resolve("sprintModuleService") as any
  await sprintService.deleteSprint(req.params.id)
  res.status(204).send()
}
