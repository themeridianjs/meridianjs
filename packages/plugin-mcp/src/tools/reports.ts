import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { hasProjectAccess, isGlobalAdmin, getAccessibleWorkspaceIds } from "@meridianjs/meridian"
import {
  type McpToolContext,
  accessibleProjectIds,
  asReqLike,
  err,
  escapeLike,
  hasPermission,
  ok,
} from "../helpers.js"

const DAY_MS = 24 * 60 * 60 * 1000
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const fromSchema = z.string().optional().describe("Start date, yyyy-MM-dd (inclusive). Default: 7 days ago")
const toSchema = z.string().optional().describe("End date, yyyy-MM-dd (inclusive). Default: today")

function parseDay(value: string): Date | null {
  if (!DATE_RE.test(value)) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

interface DateRange {
  from: string
  to: string
  fromDate: Date
  /** Exclusive upper bound — next UTC midnight after `to`, so logs with a time component that day are included. */
  toExclusive: Date
}

function parseRange(from?: string, to?: string): DateRange | { error: string } {
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  let toDate = today
  if (to) {
    const parsed = parseDay(to)
    if (!parsed) return { error: `Invalid "to" date "${to}" — expected yyyy-MM-dd` }
    toDate = parsed
  }

  let fromDate = new Date(toDate.getTime() - 6 * DAY_MS)
  if (from) {
    const parsed = parseDay(from)
    if (!parsed) return { error: `Invalid "from" date "${from}" — expected yyyy-MM-dd` }
    fromDate = parsed
  }

  if (fromDate.getTime() > toDate.getTime()) return { error: `"from" must not be after "to"` }
  if (toDate.getTime() - fromDate.getTime() > 366 * DAY_MS) {
    return { error: "Date range too large — maximum 366 days" }
  }

  return {
    from: isoDay(fromDate),
    to: isoDay(toDate),
    fromDate,
    toExclusive: new Date(toDate.getTime() + DAY_MS),
  }
}

/** Every duration in report output carries both units so clients never divide wrong. */
function dur(minutes: number) {
  return { minutes, hours: Math.round((minutes / 60) * 100) / 100 }
}

function displayName(user: any): string | null {
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ")
  return name || null
}

async function loadUserMap(ctx: McpToolContext, userIds: string[]): Promise<Map<string, any>> {
  const ids = [...new Set(userIds.filter(Boolean))]
  if (ids.length === 0) return new Map()
  const userService = ctx.scope.resolve("userModuleService") as any
  const [users] = await userService.listAndCountUsers(
    { id: ids.length === 1 ? ids[0] : { $in: ids } },
    { limit: ids.length }
  )
  return new Map((users as any[]).map((u) => [u.id, u]))
}

async function loadProjectMap(ctx: McpToolContext, projectIds: Array<string | null>): Promise<Map<string, any>> {
  const ids = [...new Set(projectIds.filter(Boolean))] as string[]
  if (ids.length === 0) return new Map()
  const projectService = ctx.scope.resolve("projectModuleService") as any
  const projects = await projectService.listProjects({ id: ids })
  return new Map((projects as any[]).map((p) => [p.id, p]))
}

function enrichByUser(groups: any[], userMap: Map<string, any>) {
  return groups.map((g) => {
    const user = userMap.get(g.user_id)
    return {
      user_id: g.user_id,
      name: user ? displayName(user) : null,
      email: user?.email ?? null,
      ...dur(g.total_minutes),
    }
  })
}

function enrichByProject(groups: any[], projectMap: Map<string, any>) {
  return groups.map((g) => ({
    project_id: g.project_id,
    project_name: g.project_id ? (projectMap.get(g.project_id)?.name ?? null) : null,
    ...dur(g.total_minutes),
  }))
}

function emptyTimeReport(range: DateRange) {
  return {
    from: range.from,
    to: range.to,
    total: dur(0),
    total_employees: 0,
    total_projects: 0,
    by_user: [],
    by_project: [],
    time_logs: [],
    count: 0,
  }
}

type StatusMap = Map<string, { name: string; category: string; position: number }>

async function loadStatusMap(ctx: McpToolContext, projectId: string, cache: Map<string, StatusMap>): Promise<StatusMap> {
  const cached = cache.get(projectId)
  if (cached) return cached
  const projectService = ctx.scope.resolve("projectModuleService") as any
  const statuses = await projectService.listStatusesByProject(projectId).catch(() => [])
  const map: StatusMap = new Map(
    (statuses as any[]).map((s) => [s.key, { name: s.name, category: s.category, position: s.position }])
  )
  cache.set(projectId, map)
  return map
}

function categoryOf(statusMap: StatusMap, statusKey: string): string {
  return statusMap.get(statusKey)?.category ?? "unknown"
}

function slimIssue(issue: any) {
  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    status: issue.status,
    priority: issue.priority,
    due_date: issue.due_date ?? null,
  }
}

export function registerReportTools(server: McpServer, ctx: McpToolContext) {
  server.registerTool(
    "get_time_report",
    {
      title: "Get time report",
      description:
        "Time-tracking report: total time logged in a date range with per-user and per-project breakdowns plus raw log entries. Filter by workspace, project, or user. Results are scoped to what the caller can access.",
      inputSchema: {
        workspace_id: z.string().optional().describe("Scope to one workspace (see list_workspaces)"),
        project_id: z.string().optional().describe("Scope to one project (see list_projects)"),
        user_id: z.string().optional().describe("Scope to one user (see list_members)"),
        from: fromSchema,
        to: toSchema,
        limit: z.number().int().min(1).max(200).optional().describe("Max raw log entries returned, default 50 (totals always cover the full range)"),
      },
    },
    async (input) => {
      const range = parseRange(input.from, input.to)
      if ("error" in range) return err(range.error)

      const issueService = ctx.scope.resolve("issueModuleService") as any
      const filters: Record<string, unknown> = {
        logged_date: { $gte: range.fromDate, $lt: range.toExclusive },
      }

      // Mirrors GET /admin/reporting/time-logs scoping (without the super-admin org_scope bypass).
      if (hasPermission(ctx, "workspace:admin")) {
        const allowed = await getAccessibleWorkspaceIds(
          asReqLike(ctx),
          input.workspace_id ? [input.workspace_id] : undefined
        )
        if (allowed.length === 0) return ok(emptyTimeReport(range))
        filters.workspace_id = allowed.length === 1 ? allowed[0] : allowed
        if (input.project_id) filters.project_id = input.project_id
      } else {
        if (input.workspace_id) {
          const workspaceMemberService = ctx.scope.resolve("workspaceMemberModuleService") as any
          const memberships = await workspaceMemberService.listWorkspaceMembers({
            workspace_id: input.workspace_id,
            user_id: ctx.user?.id,
          })
          if ((memberships as any[]).length === 0) return ok(emptyTimeReport(range))
          filters.workspace_id = input.workspace_id
        }
        const projectIds = await accessibleProjectIds(ctx)
        if (input.project_id) {
          if (!projectIds.includes(input.project_id)) return ok(emptyTimeReport(range))
          filters.project_id = input.project_id
        } else {
          if (projectIds.length === 0) return ok(emptyTimeReport(range))
          filters.project_id = projectIds
        }
      }

      if (input.user_id) filters.user_id = input.user_id

      const limit = input.limit ?? 50
      const result = await issueService.listTimeLogsForReporting({ ...filters, limit, offset: 0 })

      const projectMap = await loadProjectMap(ctx, [
        ...(result.time_logs as any[]).map((l) => l.project_id),
        ...(result.by_project as any[]).map((g) => g.project_id),
      ])
      const userMap = await loadUserMap(ctx, (result.by_user as any[]).map((g) => g.user_id))

      return ok({
        from: range.from,
        to: range.to,
        total: dur(result.total_minutes),
        total_employees: result.total_employees,
        total_projects: result.total_projects,
        by_user: enrichByUser(result.by_user, userMap),
        by_project: enrichByProject(result.by_project, projectMap),
        time_logs: (result.time_logs as any[]).map((l) => ({
          issue_identifier: l.issue_identifier,
          issue_title: l.issue_title,
          user_id: l.user_id,
          project_id: l.project_id ?? null,
          project_name: l.project_id ? (projectMap.get(l.project_id)?.name ?? null) : null,
          minutes: l.duration_minutes,
          logged_date: l.logged_date,
          description: l.description ?? null,
          running: l.duration_minutes == null,
        })),
        count: result.count,
        limit,
      })
    }
  )

  server.registerTool(
    "get_project_report",
    {
      title: "Get project report",
      description:
        "Project status report: issue counts by status and category, overdue and unassigned counts, time logged in the date range per user, active sprint progress, and recently created/completed issues. Issue counts are a current snapshot; time and recent-issue sections use the date range. Completion detection relies on the activity log, which only covers its retention window.",
      inputSchema: {
        project_id: z.string().describe("Project ID (see list_projects)"),
        from: fromSchema,
        to: toSchema,
      },
    },
    async (input) => {
      const range = parseRange(input.from, input.to)
      if ("error" in range) return err(range.error)

      const projectService = ctx.scope.resolve("projectModuleService") as any
      const project = await projectService.retrieveProject(input.project_id).catch(() => null)
      if (!project) return err(`Project ${input.project_id} not found`)
      if (!(await hasProjectAccess(asReqLike(ctx), project))) return err("Forbidden")

      const statusCache = new Map<string, StatusMap>()
      const statusMap = await loadStatusMap(ctx, input.project_id, statusCache)
      const completedKeys = new Set(
        [...statusMap.entries()].filter(([, s]) => s.category === "completed").map(([key]) => key)
      )
      const cancelledKeys = new Set(
        [...statusMap.entries()].filter(([, s]) => s.category === "cancelled").map(([key]) => key)
      )

      const issueService = ctx.scope.resolve("issueModuleService") as any
      const [issues] = await issueService.listAndCountIssues(
        { project_id: input.project_id },
        { limit: 2000 }
      )
      const allIssues = issues as any[]

      const countByStatus = new Map<string, number>()
      for (const issue of allIssues) {
        countByStatus.set(issue.status, (countByStatus.get(issue.status) ?? 0) + 1)
      }
      const byStatus = [...statusMap.entries()]
        .sort((a, b) => a[1].position - b[1].position)
        .map(([key, s]) => ({ key, name: s.name, category: s.category, count: countByStatus.get(key) ?? 0 }))
      // Status keys with no matching ProjectStatus row still show up, as category "unknown".
      for (const [key, count] of countByStatus) {
        if (!statusMap.has(key)) byStatus.push({ key, name: key, category: "unknown", count })
      }

      const isClosed = (issue: any) => completedKeys.has(issue.status) || cancelledKeys.has(issue.status)
      const now = new Date()
      const completedCount = allIssues.filter((i) => completedKeys.has(i.status)).length
      const cancelledCount = allIssues.filter((i) => cancelledKeys.has(i.status)).length
      const openIssues = allIssues.filter((i) => !isClosed(i))
      const overdue = openIssues.filter((i) => i.due_date && new Date(i.due_date) < now).length
      const unassigned = openIssues.filter((i) => !i.assignee_ids || i.assignee_ids.length === 0).length

      // limit: 1 — aggregates cover the full filtered set regardless of page size.
      const time = await issueService.listTimeLogsForReporting({
        project_id: input.project_id,
        logged_date: { $gte: range.fromDate, $lt: range.toExclusive },
        limit: 1,
        offset: 0,
      })
      const userMap = await loadUserMap(ctx, (time.by_user as any[]).map((g) => g.user_id))

      const sprintService = ctx.scope.resolve("sprintModuleService") as any
      const sprints = await sprintService.listSprintsByProject(input.project_id)
      const active = (sprints as any[]).find((s) => s.status === "active") ?? null
      const sprintIssues = active ? allIssues.filter((i) => i.sprint_id === active.id) : []
      const activeSprint = active
        ? {
            id: active.id,
            name: active.name,
            goal: active.goal ?? null,
            start_date: active.start_date ?? null,
            end_date: active.end_date ?? null,
            issue_count: sprintIssues.length,
            completed_count: sprintIssues.filter((i) => completedKeys.has(i.status)).length,
          }
        : null

      const recentlyCreated = allIssues
        .filter((i) => {
          const created = new Date(i.created_at)
          return created >= range.fromDate && created < range.toExclusive
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 25)
        .map(slimIssue)

      let recentlyCompleted: any[] = []
      let completedSource = "activity"
      const activityService = ctx.scope.resolve("activityModuleService") as any
      if (typeof activityService?.listActivities === "function") {
        const activities = await activityService.listActivities({
          entity_type: "issue",
          action: "status_changed",
          workspace_id: project.workspace_id,
          from: range.fromDate,
          to: range.toExclusive,
          limit: 1000,
        })
        const issueById = new Map(allIssues.map((i) => [i.id, i]))
        const seen = new Set<string>()
        for (const activity of activities as any[]) {
          // DESC order — the first event per issue is its latest transition in
          // the range; if that transition left the completed category, the
          // issue was reopened and must not count.
          if (seen.has(activity.entity_id)) continue
          seen.add(activity.entity_id)
          const issue = issueById.get(activity.entity_id)
          if (!issue) continue
          const movedTo = activity.changes?.status?.to
          if (typeof movedTo !== "string" || !completedKeys.has(movedTo)) continue
          recentlyCompleted.push({
            ...slimIssue(issue),
            completed_at: activity.created_at,
            completed_by: activity.actor_id,
          })
          if (recentlyCompleted.length >= 25) break
        }
      } else {
        // Host app runs an older @meridianjs/activity without listActivities.
        completedSource = "status_heuristic"
        recentlyCompleted = allIssues
          .filter((i) => {
            if (!completedKeys.has(i.status)) return false
            const updated = new Date(i.updated_at)
            return updated >= range.fromDate && updated < range.toExclusive
          })
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .slice(0, 25)
          .map((i) => ({ ...slimIssue(i), completed_at: i.updated_at, completed_by: null }))
      }

      return ok({
        project: {
          id: project.id,
          name: project.name,
          identifier: project.identifier,
          workspace_id: project.workspace_id,
          status: project.status,
        },
        from: range.from,
        to: range.to,
        issues: {
          total: allIssues.length,
          open: allIssues.length - completedCount - cancelledCount,
          completed: completedCount,
          cancelled: cancelledCount,
          overdue,
          unassigned,
          by_status: byStatus,
        },
        time_logged: {
          total: dur(time.total_minutes),
          by_user: enrichByUser(time.by_user, userMap),
        },
        active_sprint: activeSprint,
        recently_created: recentlyCreated,
        recently_completed: recentlyCompleted,
        completed_source: completedSource,
      })
    }
  )

  server.registerTool(
    "get_member_report",
    {
      title: "Get member report",
      description:
        "Per-person work report for a date range: issues they completed, currently assigned pending work, time logged (total, per project, per day), and comment count. Identify the person by user_id or email. Global admins can view anyone; other callers can only view themselves. Completion detection relies on the activity log, which only covers its retention window.",
      inputSchema: {
        user_id: z.string().optional().describe("User ID (see list_members) — provide this or email"),
        email: z.string().optional().describe("User email — alternative to user_id"),
        workspace_id: z.string().optional().describe("Scope to one workspace (see list_workspaces)"),
        from: fromSchema,
        to: toSchema,
      },
    },
    async (input) => {
      if (!input.user_id === !input.email) {
        return err("Provide exactly one of user_id or email")
      }
      const range = parseRange(input.from, input.to)
      if ("error" in range) return err(range.error)

      const userService = ctx.scope.resolve("userModuleService") as any
      let target: any = null
      if (input.user_id) {
        target = await userService.retrieveUser(input.user_id).catch(() => null)
        if (!target) return err(`User ${input.user_id} not found`)
      } else {
        const [users] = await userService.listAndCountUsers(
          { email: { $ilike: escapeLike(input.email!.trim()) } },
          { limit: 1 }
        )
        target = (users as any[])[0] ?? null
        if (!target) return err(`No user found with email ${input.email} — use list_members to see valid members`)
      }

      const isAdmin = isGlobalAdmin(asReqLike(ctx))
      if (target.id !== ctx.user?.id && !isAdmin) {
        return err("Forbidden — you can only view your own report")
      }

      let wsIds: string[]
      if (isAdmin) {
        wsIds = await getAccessibleWorkspaceIds(
          asReqLike(ctx),
          input.workspace_id ? [input.workspace_id] : undefined
        )
      } else {
        const workspaceMemberService = ctx.scope.resolve("workspaceMemberModuleService") as any
        const memberships = await workspaceMemberService.listWorkspaceMembers({ user_id: ctx.user?.id })
        wsIds = [...new Set((memberships as any[]).map((m) => m.workspace_id))]
        if (input.workspace_id) wsIds = wsIds.filter((id) => id === input.workspace_id)
      }
      if (wsIds.length === 0) return err("Workspace not found or access denied")

      const issueService = ctx.scope.resolve("issueModuleService") as any
      const statusCache = new Map<string, StatusMap>()

      // --- Completed in range ---
      let completedIssues: any[] = []
      let completedSource = "activity"
      const activityService = ctx.scope.resolve("activityModuleService") as any
      if (typeof activityService?.listActivities === "function") {
        const activities = await activityService.listActivities({
          actor_id: target.id,
          entity_type: "issue",
          action: "status_changed",
          workspace_id: wsIds,
          from: range.fromDate,
          to: range.toExclusive,
          limit: 1000,
        })
        // DESC order — keep only each issue's latest transition in the range.
        const latestByIssue = new Map<string, any>()
        for (const activity of activities as any[]) {
          if (!latestByIssue.has(activity.entity_id)) latestByIssue.set(activity.entity_id, activity)
        }
        const issueIds = [...latestByIssue.keys()]
        let issues: any[] = []
        if (issueIds.length > 0) {
          const [loaded] = await issueService.listAndCountIssues(
            { id: issueIds.length === 1 ? issueIds[0] : { $in: issueIds } },
            { limit: issueIds.length }
          )
          issues = loaded as any[]
        }
        const issueById = new Map(issues.map((i) => [i.id, i]))
        for (const [issueId, activity] of latestByIssue) {
          const issue = issueById.get(issueId)
          if (!issue || !issue.project_id) continue
          const statusMap = await loadStatusMap(ctx, issue.project_id, statusCache)
          const movedTo = activity.changes?.status?.to
          if (typeof movedTo !== "string" || categoryOf(statusMap, movedTo) !== "completed") continue
          completedIssues.push({
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            project_id: issue.project_id,
            completed_at: activity.created_at,
          })
        }
      } else {
        // Host app runs an older @meridianjs/activity without listActivities.
        completedSource = "status_heuristic"
        const [issues] = await issueService.listAndCountIssues(
          {
            assignee_ids: { $contains: target.id },
            updated_at: { $gte: range.fromDate, $lt: range.toExclusive },
          },
          { limit: 500 }
        )
        for (const issue of issues as any[]) {
          if (!wsIds.includes(issue.workspace_id) || !issue.project_id) continue
          const statusMap = await loadStatusMap(ctx, issue.project_id, statusCache)
          if (categoryOf(statusMap, issue.status) !== "completed") continue
          completedIssues.push({
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            project_id: issue.project_id,
            completed_at: issue.updated_at,
          })
        }
      }

      // --- Currently assigned, still pending ---
      const [assigned] = await issueService.listAndCountIssues(
        { assignee_ids: { $contains: target.id } },
        { limit: 500 }
      )
      const now = new Date()
      const pending: Array<{ issue: any; category: string }> = []
      for (const issue of assigned as any[]) {
        if (!wsIds.includes(issue.workspace_id)) continue
        const statusMap = issue.project_id
          ? await loadStatusMap(ctx, issue.project_id, statusCache)
          : (new Map() as StatusMap)
        const category = categoryOf(statusMap, issue.status)
        if (category === "completed" || category === "cancelled") continue
        pending.push({ issue, category })
      }
      const pendingByStatus = new Map<string, { key: string; category: string; count: number }>()
      for (const { issue, category } of pending) {
        const entry = pendingByStatus.get(issue.status) ?? { key: issue.status, category, count: 0 }
        entry.count += 1
        pendingByStatus.set(issue.status, entry)
      }
      const overdueCount = pending.filter(
        ({ issue }) => issue.due_date && new Date(issue.due_date) < now
      ).length

      // --- Time logged ---
      const time = await issueService.listTimeLogsForReporting({
        user_id: target.id,
        workspace_id: wsIds.length === 1 ? wsIds[0] : wsIds,
        logged_date: { $gte: range.fromDate, $lt: range.toExclusive },
        limit: 1000,
        offset: 0,
      })
      const projectMap = await loadProjectMap(ctx, [
        ...(time.by_project as any[]).map((g) => g.project_id),
        ...completedIssues.map((i) => i.project_id),
        ...pending.map(({ issue }) => issue.project_id),
      ])
      const byDayMap = new Map<string, number>()
      let runningTimers = 0
      for (const log of time.time_logs as any[]) {
        if (log.duration_minutes == null) {
          runningTimers += 1
          continue
        }
        const day = isoDay(new Date(log.logged_date))
        byDayMap.set(day, (byDayMap.get(day) ?? 0) + log.duration_minutes)
      }
      const byDay = [...byDayMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, minutes]) => ({ date, ...dur(minutes) }))

      // --- Comments (Comment has no workspace_id, so this count is org-wide) ---
      const [, commentCount] = await issueService.listAndCountComments(
        { author_id: target.id, created_at: { $gte: range.fromDate, $lt: range.toExclusive } },
        { limit: 1 }
      )

      const withProjectName = (item: any) => ({
        ...item,
        project_name: item.project_id ? (projectMap.get(item.project_id)?.name ?? null) : null,
      })

      return ok({
        member: {
          id: target.id,
          email: target.email,
          name: displayName(target),
        },
        from: range.from,
        to: range.to,
        completed: {
          count: completedIssues.length,
          issues: completedIssues.map(withProjectName),
          source: completedSource,
        },
        assigned_pending: {
          count: pending.length,
          overdue_count: overdueCount,
          by_status: [...pendingByStatus.values()].sort((a, b) => b.count - a.count),
          issues: pending.slice(0, 50).map(({ issue }) => withProjectName({
            ...slimIssue(issue),
            project_id: issue.project_id ?? null,
          })),
        },
        time_logged: {
          total: dur(time.total_minutes),
          by_project: enrichByProject(time.by_project, projectMap),
          by_day: byDay,
          running_timers: runningTimers,
        },
        comments: { count: commentCount, scope: "all workspaces" },
      })
    }
  )
}
