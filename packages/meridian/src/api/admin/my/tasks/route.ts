import type { Response } from "express"
import { getAccessibleWorkspaceIds } from "../../../utils/workspace-access.js"

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

  let accessibleWsIds = await getAccessibleWorkspaceIds(req)

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

  // Build DB filters — push priority/type into query instead of post-filtering
  const issueFilters: Record<string, unknown> = { workspace_id: wsFilter, assignee_ids: { $contains: userId } }
  if (req.query.priority) {
    const priorities = (req.query.priority as string).split(",").filter(Boolean)
    issueFilters.priority = priorities.length === 1 ? priorities[0] : { $in: priorities }
  }
  if (req.query.type) {
    const types = (req.query.type as string).split(",").filter(Boolean)
    issueFilters.type = types.length === 1 ? types[0] : { $in: types }
  }

  // Fetch the COMPLETE assigned set in batches — counts and the JS category
  // filter below must operate on all rows, not a truncated window.
  const BATCH = 500
  const HARD_CAP = 5000
  let issues: any[] = []
  let dbCount = 0
  do {
    const [batch, total] = await issueService.listAndCountIssues(
      issueFilters,
      { limit: BATCH, offset: issues.length, orderBy: { updated_at: "DESC" } }
    )
    dbCount = total
    issues = issues.concat(batch)
    if (batch.length === 0) break
  } while (issues.length < dbCount && issues.length < HARD_CAP)

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

    // Batch-fetch statuses for all projects in one query
    try {
      const allStatuses = await projectService.listProjectStatuss(
        { project_id: projectIds.length === 1 ? projectIds[0] : { $in: projectIds } },
        { limit: projectIds.length * 50 }
      )
      for (const s of allStatuses) {
        statusMap.set(`${s.project_id}:${s.key}`, { name: s.name, color: s.color, category: s.category })
      }
    } catch {
      // Projects may not have custom statuses
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

  // Per-category totals over the FULL enriched set — exact column counts
  // regardless of how many rows the client has paged in.
  const category_counts: Record<string, number> = {}
  for (const i of enriched) {
    category_counts[i._status.category] = (category_counts[i._status.category] ?? 0) + 1
  }

  // Apply category filter after enrichment
  if (req.query.category) {
    const categories = (req.query.category as string).split(",").filter(Boolean)
    const filtered = enriched.filter((i: any) => categories.includes(i._status.category))
    res.json({ issues: filtered.slice(offset, offset + limit), count: filtered.length, limit, offset, category_counts })
    return
  }

  const count = enriched.length
  res.json({ issues: enriched.slice(offset, offset + limit), count, limit, offset, category_counts })
}
