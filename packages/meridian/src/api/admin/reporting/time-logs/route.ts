import type { Response } from "express"
import type { IssueModuleService } from "@meridianjs/issue"

export const GET = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as IssueModuleService
  const { user_id, project_id, workspace_id, from, to } = req.query as Record<string, string | undefined>

  const filters: Record<string, unknown> = {}
  if (user_id) filters.user_id = user_id
  if (project_id) filters.project_id = project_id
  if (workspace_id) filters.workspace_id = workspace_id
  if (from || to) {
    const dateFilter: Record<string, unknown> = {}
    if (from) dateFilter.$gte = new Date(from)
    if (to) dateFilter.$lte = new Date(to)
    filters.logged_date = dateFilter
  }

  const time_logs = await issueService.listTimeLogsForReporting(filters)
  const total_minutes = (time_logs as any[]).reduce(
    (sum: number, l: any) => sum + (l.duration_minutes ?? 0),
    0
  )
  res.json({ time_logs, total_minutes })
}
