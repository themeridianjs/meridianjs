import type { Response } from "express"
import type { IssueModuleService } from "@meridianjs/issue"

export const GET = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as IssueModuleService
  const { user_id, project_id, workspace_id, workspace_ids, from, to } = req.query as Record<string, string | undefined>

  const roles: string[] = req.user?.roles ?? []
  const permissions: string[] = req.user?.permissions ?? []
  const isPrivileged = roles.includes("super-admin") || roles.includes("admin") || permissions.includes("workspace:admin")

  const filters: Record<string, unknown> = {}
  if (user_id) filters.user_id = user_id
  if (project_id) filters.project_id = project_id

  // Support both single workspace_id and comma-separated workspace_ids
  const wsIds = workspace_ids
    ? workspace_ids.split(",").filter(Boolean)
    : workspace_id
      ? [workspace_id]
      : []
  if (wsIds.length === 1) filters.workspace_id = wsIds[0]
  else if (wsIds.length > 1) filters.workspace_id = wsIds
  if (from || to) {
    const dateFilter: Record<string, unknown> = {}
    if (from) dateFilter.$gte = new Date(from)
    if (to) dateFilter.$lte = new Date(to)
    filters.logged_date = dateFilter
  }

  if (!isPrivileged && wsIds.length > 0) {
    const userId = req.user?.id
    const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
    const teamMemberService = req.scope.resolve("teamMemberModuleService") as any
    const projectMemberService = req.scope.resolve("projectMemberModuleService") as any

    // Verify membership in each requested workspace, collect accessible projects
    const allAccessibleProjectIds: string[] = []
    for (const wid of wsIds) {
      const membership = await workspaceMemberService.getMembership(wid, userId)
      if (!membership) continue // skip workspaces user isn't a member of
      const userTeamIds = await teamMemberService.getUserTeamIds(userId)
      const projectIds = await projectMemberService.getAccessibleProjectIds(userId, userTeamIds)
      allAccessibleProjectIds.push(...projectIds)
    }

    if (project_id) {
      if (!allAccessibleProjectIds.includes(project_id)) {
        res.json({ time_logs: [], total_minutes: 0 })
        return
      }
    } else {
      if (allAccessibleProjectIds.length === 0) {
        res.json({ time_logs: [], total_minutes: 0 })
        return
      }
      filters.project_id = allAccessibleProjectIds
    }
  }

  const time_logs = await issueService.listTimeLogsForReporting(filters)
  const total_minutes = (time_logs as any[]).reduce(
    (sum: number, l: any) => sum + (l.duration_minutes ?? 0),
    0
  )
  res.json({ time_logs, total_minutes })
}
