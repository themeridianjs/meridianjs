import type { Response } from "express"
import { updateIssueStatusWorkflow } from "../../../../workflows/update-issue-status.js"
import { assignIssueWorkflow } from "../../../../workflows/assign-issue.js"

export const GET = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const issue = await issueService.retrieveIssue(req.params.id)
  res.json({ issue })
}

export const PUT = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const activityService = req.scope.resolve("activityModuleService") as any

  const allowed = ["title", "description", "status", "priority", "type",
                   "assignee_ids", "parent_id", "sprint_id", "due_date", "estimate"]
  const updates: Record<string, unknown> = {}
  for (const field of allowed) {
    if (req.body[field] !== undefined) updates[field] = req.body[field]
  }
  if (updates.due_date) updates.due_date = new Date(updates.due_date as string)

  // Route status changes and assignment changes through dedicated workflows
  // (with compensation); other field updates go direct.

  if (updates.status !== undefined) {
    const { result: issue, errors, transaction_status } = await updateIssueStatusWorkflow(req.scope).run({
      input: {
        issueId: req.params.id,
        status: updates.status as string,
        actor_id: req.user?.id ?? null,
      },
    })
    if (transaction_status === "reverted") {
      const err = errors[0]
      res.status((err as any).status ?? 500).json({ error: { message: err.message } })
      return
    }
    // If there are other fields to update alongside status, fall through to direct update
    delete updates.status
    if (Object.keys(updates).length === 0) {
      res.json({ issue })
      return
    }
    // Apply remaining fields directly (edge case: updating status + other fields in one call)
    const finalIssue = await issueService.updateIssue(req.params.id, updates)
    res.json({ issue: finalIssue })
    return
  }

  if ("assignee_ids" in updates) {
    const { result: issue, errors, transaction_status } = await assignIssueWorkflow(req.scope).run({
      input: {
        issueId: req.params.id,
        assignee_ids: Array.isArray(updates.assignee_ids) ? updates.assignee_ids as string[] : [],
        actor_id: req.user?.id ?? null,
      },
    })
    if (transaction_status === "reverted") {
      const err = errors[0]
      res.status((err as any).status ?? 500).json({ error: { message: err.message } })
      return
    }
    delete updates.assignee_ids
    if (Object.keys(updates).length === 0) {
      res.json({ issue })
      return
    }
    const finalIssue = await issueService.updateIssue(req.params.id, updates)
    res.json({ issue: finalIssue })
    return
  }

  // Plain field updates (title, description, priority, etc.) — direct service call
  // Fetch current state first so we can record `from` values in the activity log
  const currentIssue = await issueService.retrieveIssue(req.params.id)
  const issue = await issueService.updateIssue(req.params.id, updates)

  await activityService.recordActivity({
    entity_type: "issue",
    entity_id: req.params.id,
    actor_id: req.user?.id ?? "system",
    action: "updated",
    workspace_id: issue.workspace_id,
    changes: Object.fromEntries(
      Object.keys(updates).map(k => [k, { from: (currentIssue as any)[k], to: updates[k] }])
    ),
  }).catch(() => {})

  res.json({ issue })
}

export const DELETE = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  await issueService.deleteIssue(req.params.id)
  res.status(204).send()
}
