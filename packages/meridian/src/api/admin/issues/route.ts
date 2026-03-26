import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"
import { createIssueWorkflow } from "../../../workflows/create-issue.js"
import { hasProjectAccess } from "../../utils/project-access.js"
import { getAccessibleWorkspaceIds } from "../../utils/workspace-access.js"

export const GET = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const maxLimit = req.query.project_id ? 1000 : 200
  const limit = Math.min(Number(req.query.limit) || 50, maxLimit)
  const offset = Number(req.query.offset) || 0
  const filters: Record<string, unknown> = {}

  const parseMulti = (val: string) => {
    const parts = val.split(",").filter(Boolean)
    return parts.length === 1 ? parts[0] : { $in: parts }
  }

  if (req.query.project_id) filters.project_id = req.query.project_id
  if (req.query.status) filters.status = parseMulti(req.query.status as string)
  if (req.query.type) filters.type = parseMulti(req.query.type as string)
  if (req.query.priority) filters.priority = parseMulti(req.query.priority as string)
  if (req.query.sprint_id === "none") filters.sprint_id = null
  else if (req.query.sprint_id) filters.sprint_id = req.query.sprint_id as string
  if (req.query.task_list_id === "none") filters.task_list_id = null
  else if (req.query.task_list_id) filters.task_list_id = req.query.task_list_id as string

  // parent_id filter: "none" = top-level only, else filter by specific parent
  if (req.query.parent_id === "none") filters.parent_id = null
  else if (req.query.parent_id) filters.parent_id = req.query.parent_id as string

  // assignee_id — filter using raw SQL on the jsonb column
  if (req.query.assignee_id) {
    const aid = req.query.assignee_id as string
    filters.assignee_ids = { $contains: aid }
  }

  // search — text search on title and identifier
  if (req.query.search) {
    const term = `%${req.query.search}%`
    filters.$or = [
      { title: { $ilike: term } },
      { identifier: { $ilike: term } },
    ]
  }

  if (req.query.project_id) {
    // Scoped to a specific project — verify access
    const projectService = req.scope.resolve("projectModuleService") as any
    const project = await projectService.retrieveProject(req.query.project_id).catch(() => null)
    if (!project) { res.status(404).json({ error: { message: "Project not found" } }); return }
    if (!await hasProjectAccess(req, project)) {
      res.status(403).json({ error: { message: "Forbidden" } })
      return
    }
  } else {
    // No project scope — restrict to projects the caller can access
    const projectService = req.scope.resolve("projectModuleService") as any
    const userId: string = req.user?.id
    const roles: string[] = req.user?.roles ?? []
    const isPrivileged = roles.includes("super-admin") || roles.includes("admin")

    let accessibleProjectIds: string[]

    if (isPrivileged) {
      const allowedWsIds = await getAccessibleWorkspaceIds(req)

      if (allowedWsIds.length === 0) {
        res.json({ issues: [], count: 0, limit, offset })
        return
      }

      const [projects] = await projectService.listAndCountProjects(
        { workspace_id: allowedWsIds.length === 1 ? allowedWsIds[0] : allowedWsIds },
        { limit: 1000 }
      )
      accessibleProjectIds = (projects as any[]).map((p: any) => p.id)
    } else {
      const teamMemberService = req.scope.resolve("teamMemberModuleService") as any
      const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
      const userTeamIds = await teamMemberService.getUserTeamIds(userId)
      accessibleProjectIds = await projectMemberService.getAccessibleProjectIds(userId, userTeamIds)
    }

    if (accessibleProjectIds.length === 0) {
      res.json({ issues: [], count: 0, limit, offset })
      return
    }

    filters.project_id = accessibleProjectIds.length === 1
      ? accessibleProjectIds[0]
      : { $in: accessibleProjectIds }
  }

  // sort_by + sort_order
  const allowedSortColumns = ["created_at", "updated_at", "title", "priority", "due_date", "number"]
  const sortBy = allowedSortColumns.includes(req.query.sort_by as string) ? req.query.sort_by as string : "created_at"
  const sortOrder = req.query.sort_order === "desc" ? "DESC" : "ASC"

  const [issues, count] = await issueService.listAndCountIssues(filters, { limit, offset, orderBy: { [sortBy]: sortOrder } })

  // When fetching top-level issues, enrich with child_count so the UI
  // knows which rows have expandable children without a separate request.
  if (req.query.parent_id === "none" && issues.length > 0) {
    const issueIds = issues.map((i: any) => i.id)
    const [children] = await issueService.listAndCountIssues(
      { parent_id: { $in: issueIds } },
      { limit: 10000 }
    )
    const childCountMap: Record<string, number> = {}
    for (const child of children) {
      const pid = (child as any).parent_id
      if (pid) childCountMap[pid] = (childCountMap[pid] ?? 0) + 1
    }
    for (const issue of issues) {
      ;(issue as any).child_count = childCountMap[(issue as any).id] ?? 0
    }
  }

  res.json({ issues, count, limit, offset })
}

export const POST = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("issue:create")(req, res, async () => {
    try {
      const { title, project_id, workspace_id, description, type, priority, status,
              assignee_ids, reporter_id, parent_id, start_date, due_date, estimate, sprint_id, task_list_id, metadata,
              recurrence_frequency, recurrence_end_date, mentioned_user_ids,
              depends_on_ids, related_to_ids } = req.body
      if (!title || !project_id || !workspace_id) {
        res.status(400).json({ error: { message: "title, project_id and workspace_id are required" } })
        return
      }
      const { result: issue, errors, transaction_status } = await createIssueWorkflow(req.scope).run({
        input: {
          title, project_id, workspace_id, description, type, priority, status,
          assignee_ids: Array.isArray(assignee_ids) ? assignee_ids : null,
          reporter_id: reporter_id ?? (req.user?.id ?? null),
          parent_id: parent_id ?? null,
          start_date: start_date ? new Date(start_date) : null,
          due_date: due_date ? new Date(due_date) : undefined,
          estimate: estimate ?? null, sprint_id: sprint_id ?? null, task_list_id: task_list_id ?? null,
          metadata: metadata ?? null,
          recurrence_frequency: recurrence_frequency ?? null,
          recurrence_end_date: recurrence_end_date ? new Date(recurrence_end_date) : null,
          depends_on_ids: Array.isArray(depends_on_ids) ? depends_on_ids : null,
          related_to_ids: Array.isArray(related_to_ids) ? related_to_ids : null,
          actor_id: req.user?.id ?? null,
        },
      })
      if (transaction_status === "reverted") {
        const err = errors[0]
        res.status((err as any).status ?? 500).json({ error: { message: err.message } })
        return
      }
      // Emit mention notifications if description has @mentions
      const validMentionIds: string[] = Array.isArray(mentioned_user_ids)
        ? mentioned_user_ids.filter((id: unknown) => typeof id === "string")
        : []
      if (validMentionIds.length > 0 && description) {
        const eventBus = req.scope.resolve("eventBus") as any
        eventBus.emit({
          name: "issue.mentioned",
          data: {
            issue_id: issue.id,
            actor_id: req.user?.id ?? "system",
            mentioned_user_ids: validMentionIds,
            workspace_id: issue.workspace_id,
            project_id: issue.project_id,
          },
        }).catch(() => {})
      }
      res.status(201).json({ issue })
    } catch (err) {
      next(err)
    }
  })
}
