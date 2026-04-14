import type { Response } from "express"
import { getAccessibleWorkspaceIds } from "../../../utils/workspace-access.js"

export const GET = async (req: any, res: Response) => {
  // ── Auth: require privileged caller ──
  const roles: string[] = req.user?.roles ?? []
  const permissions: string[] = req.user?.permissions ?? []
  const isPrivileged =
    roles.includes("super-admin") ||
    roles.includes("admin") ||
    permissions.includes("workspace:admin")

  if (!isPrivileged) {
    res.status(403).json({ error: { message: "Forbidden — admin access required" } })
    return
  }

  const viewerId: string = req.user?.id
  if (!viewerId) {
    res.status(401).json({ error: { message: "Unauthorized" } })
    return
  }

  // ── Target user ──
  const targetUserId = req.query.user_id as string | undefined
  if (!targetUserId) {
    res.status(400).json({ error: { message: "user_id query parameter is required" } })
    return
  }

  const issueService = req.scope.resolve("issueModuleService") as any
  const projectService = req.scope.resolve("projectModuleService") as any

  const limit = Math.min(Number(req.query.limit) || 50, 200)
  const offset = Number(req.query.offset) || 0

  // ── Workspace scoping ──
  const isSuperAdmin = roles.includes("super-admin")
  const issueFilters: Record<string, unknown> = {
    assignee_ids: { $contains: targetUserId },
  }

  // Super-admins see all workspaces; others are scoped to their accessible ones
  if (!isSuperAdmin) {
    let accessibleWsIds = await getAccessibleWorkspaceIds(req)

    if (req.query.workspace_id) {
      const requested = (req.query.workspace_id as string).split(",").filter(Boolean)
      const accessibleSet = new Set(accessibleWsIds)
      accessibleWsIds = requested.filter((id) => accessibleSet.has(id))
    }

    if (accessibleWsIds.length === 0) {
      res.json({ issues: [], count: 0, limit, offset })
      return
    }

    issueFilters.workspace_id = accessibleWsIds.length === 1 ? accessibleWsIds[0] : { $in: accessibleWsIds }
  } else if (req.query.workspace_id) {
    // Super-admin with workspace filter
    const wsIds = (req.query.workspace_id as string).split(",").filter(Boolean)
    if (wsIds.length > 0) {
      issueFilters.workspace_id = wsIds.length === 1 ? wsIds[0] : { $in: wsIds }
    }
  }
  if (req.query.priority) {
    const priorities = (req.query.priority as string).split(",").filter(Boolean)
    issueFilters.priority = priorities.length === 1 ? priorities[0] : { $in: priorities }
  }
  if (req.query.type) {
    const types = (req.query.type as string).split(",").filter(Boolean)
    issueFilters.type = types.length === 1 ? types[0] : { $in: types }
  }

  let [issues] = await issueService.listAndCountIssues(
    issueFilters,
    { limit: 500, offset: 0, orderBy: { updated_at: "DESC" } },
  )

  // ── Determine viewer's accessible projects ──
  const isGlobalAdmin = roles.includes("super-admin") || roles.includes("admin")
  let viewerAccessibleProjectIds: Set<string>

  if (isGlobalAdmin) {
    // Global admins can see all projects
    viewerAccessibleProjectIds = new Set(issues.map((i: any) => i.project_id))
  } else {
    const teamMemberService = req.scope.resolve("teamMemberModuleService") as any
    const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
    const viewerTeamIds = await teamMemberService.getUserTeamIds(viewerId)
    const accessible = await projectMemberService.getAccessibleProjectIds(viewerId, viewerTeamIds)
    viewerAccessibleProjectIds = new Set(accessible)
  }

  // ── Enrich with project + status data ──
  const projectIds = [...new Set(issues.map((i: any) => i.project_id))] as string[]

  const projectMap = new Map<string, { name: string; identifier: string }>()
  const statusMap = new Map<string, { name: string; color: string; category: string }>()

  if (projectIds.length > 0) {
    const [projects] = await projectService.listAndCountProjects(
      { id: { $in: projectIds } },
      { limit: projectIds.length },
    )
    for (const p of projects) {
      projectMap.set(p.id, { name: p.name, identifier: p.identifier })
    }

    try {
      const allStatuses = await projectService.listProjectStatuss(
        { project_id: projectIds.length === 1 ? projectIds[0] : { $in: projectIds } },
        { limit: projectIds.length * 50 },
      )
      for (const s of allStatuses) {
        statusMap.set(`${s.project_id}:${s.key}`, { name: s.name, color: s.color, category: s.category })
      }
    } catch {
      // Projects may not have custom statuses
    }
  }

  // ── Build enriched response with privacy redaction ──
  const enriched = issues.map((issue: any) => {
    const isAccessible = viewerAccessibleProjectIds.has(issue.project_id)
    const proj = projectMap.get(issue.project_id)
    const status = statusMap.get(`${issue.project_id}:${issue.status}`)

    if (!isAccessible) {
      return {
        id: issue.id,
        identifier: "---",
        title: "Private Issue",
        description: null,
        status: issue.status,
        priority: "none",
        type: issue.type,
        start_date: null,
        due_date: null,
        assignee_ids: issue.assignee_ids,
        project_id: issue.project_id,
        workspace_id: issue.workspace_id,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        _project: { name: "Private Project", identifier: "---" },
        _status: status ?? { name: issue.status, color: "#94a3b8", category: "backlog" },
        _private: true,
      }
    }

    return {
      ...issue,
      _project: proj ?? null,
      _status: status ?? { name: issue.status, color: "#94a3b8", category: "backlog" },
      _private: false,
    }
  })

  // ── Category filter (post-enrichment) ──
  if (req.query.category) {
    const categories = (req.query.category as string).split(",").filter(Boolean)
    const filtered = enriched.filter((i: any) => categories.includes(i._status.category))
    res.json({ issues: filtered.slice(offset, offset + limit), count: filtered.length, limit, offset })
    return
  }

  const count = enriched.length
  res.json({ issues: enriched.slice(offset, offset + limit), count, limit, offset })
}
