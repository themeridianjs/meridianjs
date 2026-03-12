import type { Response } from "express"
import type { IssueModuleService } from "@meridianjs/issue"
import type { WorkspaceMemberModuleService } from "@meridianjs/workspace-member"
import type { TeamMemberModuleService } from "@meridianjs/team-member"
import type { ProjectMemberModuleService } from "@meridianjs/project-member"

export const GET = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as IssueModuleService
  const { user_id, user_ids, project_id, project_ids, workspace_id, workspace_ids, from, to, limit, offset } = req.query as Record<string, string | undefined>

  const roles: string[] = req.user?.roles ?? []
  const permissions: string[] = req.user?.permissions ?? []
  const isPrivileged = roles.includes("super-admin") || roles.includes("admin") || permissions.includes("workspace:admin")

  const filters: Record<string, unknown> = {}

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

  // Server-side user/project filters from query params
  const filterUserIds = user_ids ? user_ids.split(",").filter(Boolean) : user_id ? [user_id] : []
  const filterProjectIds = project_ids ? project_ids.split(",").filter(Boolean) : project_id ? [project_id] : []

  if (!isPrivileged && wsIds.length > 0) {
    const userId = req.user?.id
    const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as WorkspaceMemberModuleService
    const teamMemberService = req.scope.resolve("teamMemberModuleService") as TeamMemberModuleService
    const projectMemberService = req.scope.resolve("projectMemberModuleService") as ProjectMemberModuleService

    // Hoist getUserTeamIds out of the loop — same result every iteration
    const userTeamIds = await teamMemberService.getUserTeamIds(userId)

    // Verify membership in each requested workspace, collect accessible projects
    const allAccessibleProjectIds: string[] = []
    for (const wid of wsIds) {
      const membership = await workspaceMemberService.getMembership(wid, userId)
      if (!membership) continue // skip workspaces user isn't a member of
      const projectIds = await projectMemberService.getAccessibleProjectIds(userId, userTeamIds)
      allAccessibleProjectIds.push(...projectIds)
    }

    if (filterProjectIds.length > 0) {
      // Intersect requested projects with accessible projects
      const accessible = new Set(allAccessibleProjectIds)
      const allowed = filterProjectIds.filter((id) => accessible.has(id))
      if (allowed.length === 0) {
        res.json({ time_logs: [], count: 0, total_minutes: 0, total_employees: 0, total_projects: 0, limit: 0, offset: 0 })
        return
      }
      filters.project_id = allowed
    } else {
      if (allAccessibleProjectIds.length === 0) {
        res.json({ time_logs: [], count: 0, total_minutes: 0, total_employees: 0, total_projects: 0, limit: 0, offset: 0 })
        return
      }
      filters.project_id = allAccessibleProjectIds
    }
  } else if (filterProjectIds.length > 0) {
    filters.project_id = filterProjectIds
  }

  if (filterUserIds.length > 0) {
    filters.user_id = filterUserIds
  }

  const parsedLimit = limit ? parseInt(limit, 10) : 200
  const parsedOffset = offset ? parseInt(offset, 10) : 0

  const result = await issueService.listTimeLogsForReporting({
    ...filters,
    limit: parsedLimit,
    offset: parsedOffset,
  })

  res.json({
    time_logs: result.time_logs,
    count: result.count,
    total_minutes: result.total_minutes,
    total_employees: result.total_employees,
    total_projects: result.total_projects,
    limit: parsedLimit,
    offset: parsedOffset,
  })
}
