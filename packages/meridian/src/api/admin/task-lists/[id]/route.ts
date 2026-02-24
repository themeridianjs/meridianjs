import type { Response } from "express"

export const PUT = async (req: any, res: Response) => {
  const { name, description } = req.body
  const issueService = req.scope.resolve("issueModuleService") as any
  const taskList = await issueService.updateTaskList(req.params.id, { name, description })
  res.json({ task_list: taskList })
}

export const DELETE = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  await issueService.deleteTaskList(req.params.id)
  res.status(204).end()
}
