import type { Response } from "express"
import { createProjectWorkflow } from "../../../workflows/create-project.js"

export const GET = async (req: any, res: Response) => {
  const projectService = req.scope.resolve("projectModuleService") as any
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const offset = Number(req.query.offset) || 0
  const filters: Record<string, unknown> = {}
  if (req.query.workspace_id) filters.workspace_id = req.query.workspace_id
  if (req.query.status) filters.status = req.query.status
  const [projects, count] = await projectService.listAndCountProjects(filters, { limit, offset })
  res.json({ projects, count, limit, offset })
}

export const POST = async (req: any, res: Response) => {
  const { name, description, workspace_id, visibility, icon, color, identifier, initial_statuses } = req.body
  if (!name || !workspace_id) {
    res.status(400).json({ error: { message: "name and workspace_id are required" } })
    return
  }
  const { result: project, errors, transaction_status } = await createProjectWorkflow(req.scope).run({
    input: {
      name, identifier, description: description ?? null, workspace_id,
      visibility: visibility ?? "private", icon: icon ?? null, color: color ?? null,
      owner_id: req.user?.id ?? null, actor_id: req.user?.id ?? null,
      initial_statuses: initial_statuses ?? undefined,
    },
  })
  if (transaction_status === "reverted") {
    const err = errors[0]
    res.status((err as any).status ?? 500).json({ error: { message: err.message } })
    return
  }
  res.status(201).json({ project })
}
