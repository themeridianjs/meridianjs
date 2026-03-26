import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const projectService = req.scope.resolve("projectModuleService") as any

  const limit = Math.min(Number(req.query.limit) || 50, 200)
  const offset = Number(req.query.offset) || 0

  const userId = req.user?.id
  if (!userId) {
    res.status(401).json({ error: { message: "Unauthorized" } })
    return
  }

  // Determine accessible workspaces: public ones + private ones where user is a member
  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
  const [allWorkspaces] = await workspaceService.listAndCountWorkspaces({}, { limit: 1000 })
  const memberWsIds = new Set<string>(await workspaceMemberService.getWorkspaceIdsForUser(userId))
  let accessibleWsIds: string[] = (allWorkspaces as any[])
    .filter((ws: any) => !ws.is_private || memberWsIds.has(ws.id))
    .map((ws: any) => ws.id)

  // If caller passed workspace_id filter, intersect with accessible IDs
  if (req.query.workspace_id) {
    const requested = (req.query.workspace_id as string).split(",").filter(Boolean)
    const accessibleSet = new Set(accessibleWsIds)
    accessibleWsIds = requested.filter((id) => accessibleSet.has(id))
  }

  if (accessibleWsIds.length === 0) {
    res.json({ issues: [], count: 0, limit, offset })
    return
  }

  const wsFilter = accessibleWsIds.length === 1 ? accessibleWsIds[0] : { $in: accessibleWsIds }

  // Fetch issues assigned to this user within accessible workspaces
  let [issues, count] = await issueService.listAndCountIssues(
    { workspace_id: wsFilter, assignee_ids: { $contains: userId } },
    { limit: 500, offset: 0, orderBy: { updated_at: "DESC" } }
  )

  // Apply optional filters
  if (req.query.priority) {
    const priorities = (req.query.priority as string).split(",").filter(Boolean)
    issues = issues.filter((i: any) => priorities.includes(i.priority))
  }
  if (req.query.type) {
    const types = (req.query.type as string).split(",").filter(Boolean)
    issues = issues.filter((i: any) => types.includes(i.type))
  }

  // Collect unique project IDs for enrichment
  const projectIds = [...new Set(issues.map((i: any) => i.project_id))] as string[]

  // Batch-fetch projects and their statuses
  const projectMap = new Map<string, { name: string; identifier: string }>()
  const statusMap = new Map<string, { name: string; color: string; category: string }>()

  if (projectIds.length > 0) {
    const [projects] = await projectService.listAndCountProjects(
      { id: { $in: projectIds } },
      { limit: projectIds.length }
    )
    for (const p of projects) {
      projectMap.set(p.id, { name: p.name, identifier: p.identifier })
    }

    // Fetch statuses for all projects
    for (const pid of projectIds) {
      try {
        const statuses = await projectService.listProjectStatuss({ project_id: pid }, { limit: 50 })
        for (const s of statuses) {
          // Key by project_id + status_key for lookup
          statusMap.set(`${pid}:${s.key}`, { name: s.name, color: s.color, category: s.category })
        }
      } catch {
        // Project may not have custom statuses
      }
    }
  }

  // Enrich issues
  const enriched = issues.map((issue: any) => {
    const proj = projectMap.get(issue.project_id)
    const status = statusMap.get(`${issue.project_id}:${issue.status}`)
    return {
      ...issue,
      _project: proj ?? null,
      _status: status ?? { name: issue.status, color: "#94a3b8", category: "backlog" },
    }
  })

  // Apply category filter after enrichment
  if (req.query.category) {
    const categories = (req.query.category as string).split(",").filter(Boolean)
    const filtered = enriched.filter((i: any) => categories.includes(i._status.category))
    res.json({ issues: filtered.slice(offset, offset + limit), count: filtered.length, limit, offset })
    return
  }

  count = enriched.length
  res.json({ issues: enriched.slice(offset, offset + limit), count, limit, offset })
}
