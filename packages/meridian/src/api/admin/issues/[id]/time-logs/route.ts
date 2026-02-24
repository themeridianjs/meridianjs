import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const logs = await issueService.listTimeLogsByIssue(req.params.id)
  const total_minutes = (logs as any[]).reduce((sum: number, log: any) => sum + (log.duration_minutes ?? 0), 0)
  res.json({ time_logs: logs, total_minutes })
}

export const POST = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const { duration_minutes, description, logged_date } = req.body
  if (typeof duration_minutes !== "number" || duration_minutes <= 0) {
    res.status(400).json({ error: { message: "duration_minutes must be a positive number." } })
    return
  }
  const issue = await issueService.retrieveIssue(req.params.id).catch(() => null)
  if (!issue) { res.status(404).json({ error: { message: "Issue not found." } }); return }
  const entry = await issueService.createManualTimeLog({
    issue_id: req.params.id, user_id: req.user?.id ?? "system", workspace_id: issue.workspace_id,
    duration_minutes, description: description ?? null,
    logged_date: logged_date ? new Date(logged_date) : undefined,
  })
  res.status(201).json({ time_log: entry })
}
