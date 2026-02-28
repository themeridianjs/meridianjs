import type { Response } from "express"
import { hasProjectAccess } from "../../../../utils/project-access.js"

export const GET = async (req: any, res: Response) => {
  const projectService = req.scope.resolve("projectModuleService") as any
  const project = await projectService.retrieveProject(req.params.id).catch(() => null)
  if (!project) { res.status(404).json({ error: { message: "Project not found" } }); return }
  if (!await hasProjectAccess(req, project)) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }
  const issueService = req.scope.resolve("issueModuleService") as any
  const taskLists = await issueService.listTaskListsByProject(req.params.id)
  res.json({ task_lists: taskLists, count: taskLists.length })
}

export const POST = async (req: any, res: Response) => {
  const { name, description } = req.body
  if (!name?.trim()) { res.status(400).json({ error: { message: "name is required" } }); return }
  const projectService = req.scope.resolve("projectModuleService") as any
  const project = await projectService.retrieveProject(req.params.id).catch(() => null)
  if (!project) { res.status(404).json({ error: { message: "Project not found" } }); return }
  if (!await hasProjectAccess(req, project)) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }
  const issueService = req.scope.resolve("issueModuleService") as any
  const taskList = await issueService.createTaskList({
    name: name.trim(), description: description?.trim() || undefined, project_id: req.params.id,
  })
  res.status(201).json({ task_list: taskList })
}
