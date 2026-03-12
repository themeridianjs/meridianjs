import type { Response } from "express"

export const PUT = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const activityService = req.scope.resolve("activityModuleService") as any
  const entry = await issueService.retrieveTimeLog(req.params.logId)
  if (!entry) {
    res.status(404).json({ error: { message: "Time log not found" } })
    return
  }
  if (entry.user_id !== req.user?.id) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }
  const { duration_minutes, description, logged_date } = req.body

  // Capture previous values for activity diff
  const before = {
    duration_minutes: entry.duration_minutes,
    description: entry.description,
    logged_date: entry.logged_date,
  }

  const updated = await issueService.updateTimeLog(req.params.logId, {
    duration_minutes,
    description,
    logged_date: logged_date ? new Date(logged_date) : undefined,
  })

  // Build changes object (only fields that actually changed)
  const changes: Record<string, { from: unknown; to: unknown }> = {}
  if (duration_minutes !== undefined && duration_minutes !== before.duration_minutes) {
    changes.duration_minutes = { from: before.duration_minutes, to: duration_minutes }
  }
  if (description !== undefined && description !== before.description) {
    changes.description = { from: before.description, to: description }
  }
  if (logged_date !== undefined) {
    changes.logged_date = { from: before.logged_date, to: logged_date }
  }

  activityService.recordActivity({
    entity_type: "issue", entity_id: entry.issue_id,
    actor_id: req.user?.id ?? "system", action: "time_log_updated", workspace_id: entry.workspace_id,
    changes,
  }).catch(() => {})

  res.json({ time_log: updated })
}

export const DELETE = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const activityService = req.scope.resolve("activityModuleService") as any
  const entry = await issueService.retrieveTimeLog(req.params.logId)
  if (!entry) {
    res.status(404).json({ error: { message: "Time log not found" } })
    return
  }
  if (entry.user_id !== req.user?.id) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }
  const deleted = await issueService.deleteTimeLog(req.params.logId)

  activityService.recordActivity({
    entity_type: "issue", entity_id: entry.issue_id,
    actor_id: req.user?.id ?? "system", action: "time_log_deleted", workspace_id: entry.workspace_id,
    changes: {
      duration_minutes: { from: entry.duration_minutes, to: null },
      description: { from: entry.description, to: null },
    },
  }).catch(() => {})

  res.json({ time_log: deleted })
}
