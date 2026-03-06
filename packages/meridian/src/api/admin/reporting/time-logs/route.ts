import type { Response } from "express"
import type { IssueModuleService } from "@meridianjs/issue"

export const GET = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as IssueModuleService
  const { user_id, project_id, workspace_id, from, to } = req.query as Record<string, string | undefined>

  const roles: string[] = req.user?.roles ?? []
  const permissions: string[] = req.user?.permissions ?? []
  const isPrivileged = roles.includes("super-admin") || roles.includes("admin") || permissions.includes("workspace:admin")

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

  if (!isPrivileged && workspace_id) {
    const userId = req.user?.id
    const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
    const membership = await workspaceMemberService.getMembership(workspace_id, userId)
    if (!membership) {
      res.status(403).json({ error: { message: "Forbidden" } })
      return
    }
    const teamMemberService = req.scope.resolve("teamMemberModuleService") as any
    const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
    const userTeamIds = await teamMemberService.getUserTeamIds(userId)
    const accessibleProjectIds = await projectMemberService.getAccessibleProjectIds(userId, userTeamIds)

    if (project_id) {
      // Requested a specific project — deny if not accessible
      if (!accessibleProjectIds.includes(project_id)) {
        res.json({ time_logs: [], total_minutes: 0 })
        return
      }
    } else {
      // Scope to accessible projects only
      if (accessibleProjectIds.length === 0) {
        res.json({ time_logs: [], total_minutes: 0 })
        return
      }
      filters.project_id = accessibleProjectIds
    }
  }

  const time_logs = await issueService.listTimeLogsForReporting(filters)
  const total_minutes = (time_logs as any[]).reduce(
    (sum: number, l: any) => sum + (l.duration_minutes ?? 0),
    0
  )
  res.json({ time_logs, total_minutes })
}
