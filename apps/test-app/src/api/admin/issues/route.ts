import type { Response } from "express"
import { createIssueWorkflow } from "../../../workflows/create-issue.js"

export const GET = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const limit = Math.min(Number(req.query.limit) || 50, 200)
  const offset = Number(req.query.offset) || 0
  const filters: Record<string, unknown> = {}
  if (req.query.project_id) filters.project_id = req.query.project_id
  if (req.query.status) filters.status = req.query.status
  if (req.query.type) filters.type = req.query.type
  // sprint_id=<id> → issues in that sprint; sprint_id=none → unscheduled issues
  if (req.query.sprint_id === "none") filters.sprint_id = null
  else if (req.query.sprint_id) filters.sprint_id = req.query.sprint_id as string

  const [issues, count] = await issueService.listAndCountIssues(filters, { limit, offset })
  res.json({ issues, count, limit, offset })
}

export const POST = async (req: any, res: Response) => {
  const {
    title, project_id, workspace_id,
    description, type, priority, status,
    assignee_ids, reporter_id, parent_id,
    due_date, estimate,
  } = req.body

  if (!title || !project_id || !workspace_id) {
    res.status(400).json({ error: { message: "title, project_id and workspace_id are required" } })
    return
  }

  const { result: issue, errors, transaction_status } = await createIssueWorkflow(req.scope).run({
    input: {
      title,
      project_id,
      workspace_id,
      description,
      type,
      priority,
      status,
      assignee_ids: Array.isArray(assignee_ids) ? assignee_ids : null,
      reporter_id: reporter_id ?? (req.user?.id ?? null),
      parent_id: parent_id ?? null,
      due_date: due_date ? new Date(due_date) : undefined,
      estimate: estimate ?? null,
      actor_id: req.user?.id ?? null,
    },
  })

  if (transaction_status === "reverted") {
    const err = errors[0]
    const status_code = (err as any).status ?? 500
    res.status(status_code).json({ error: { message: err.message } })
    return
  }

  res.status(201).json({ issue })
}
