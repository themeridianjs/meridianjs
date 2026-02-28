import type { Response } from "express"
import { hasProjectAccess } from "../../../utils/project-access.js"

export const PUT = async (req: any, res: Response) => {
  const { name, description } = req.body
  const issueService = req.scope.resolve("issueModuleService") as any
  const taskListRepo = req.scope.resolve("taskListRepository") as any
  const taskList = await taskListRepo.findOne({ id: req.params.id })
  if (!taskList) { res.status(404).json({ error: { message: "Task list not found" } }); return }
  const projectService = req.scope.resolve("projectModuleService") as any
  const project = await projectService.retrieveProject(taskList.project_id).catch(() => null)
  if (!project) { res.status(404).json({ error: { message: "Project not found" } }); return }
  if (!await hasProjectAccess(req, project)) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }
  const updated = await issueService.updateTaskList(req.params.id, { name, description })
  res.json({ task_list: updated })
}

export const DELETE = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const taskListRepo = req.scope.resolve("taskListRepository") as any
  const taskList = await taskListRepo.findOne({ id: req.params.id })
  if (!taskList) { res.status(404).json({ error: { message: "Task list not found" } }); return }
  const projectService = req.scope.resolve("projectModuleService") as any
  const project = await projectService.retrieveProject(taskList.project_id).catch(() => null)
  if (!project) { res.status(404).json({ error: { message: "Project not found" } }); return }
  if (!await hasProjectAccess(req, project)) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }
  await issueService.deleteTaskList(req.params.id)
  res.status(204).end()
}
