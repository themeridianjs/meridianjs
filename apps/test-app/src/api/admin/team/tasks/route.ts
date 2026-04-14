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

  const targetUserId = req.query.user_id as string | undefined
  if (!targetUserId) {
    res.status(400).json({ error: { message: "user_id query parameter is required" } })
    return
  }

  // Broad fetch — then post-filter by target user's assignee
  let [issues] = await issueService.listAndCountIssues(
    {},
    { limit: 500, offset: 0, orderBy: { updated_at: "DESC" } },
  )

  issues = issues.filter((i: any) => (i.assignee_ids ?? []).includes(targetUserId))

  // Filter by workspace_id(s)
  if (req.query.workspace_id) {
    const wsIds = (req.query.workspace_id as string).split(",").filter(Boolean)
    issues = issues.filter((i: any) => wsIds.includes(i.workspace_id))
  }

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

    for (const pid of projectIds) {
      try {
        const statuses = await projectService.listProjectStatuss({ project_id: pid }, { limit: 50 })
        for (const s of statuses) {
          statusMap.set(`${pid}:${s.key}`, { name: s.name, color: s.color, category: s.category })
        }
      } catch {
        // Project may not have custom statuses
      }
    }
  }

  // Enrich issues (no privacy redaction in test-app)
  const enriched = issues.map((issue: any) => {
    const proj = projectMap.get(issue.project_id)
    const status = statusMap.get(`${issue.project_id}:${issue.status}`)
    return {
      ...issue,
      _project: proj ?? null,
      _status: status ?? { name: issue.status, color: "#94a3b8", category: "backlog" },
      _private: false,
    }
  })

  // Apply category filter after enrichment
  if (req.query.category) {
    const categories = (req.query.category as string).split(",").filter(Boolean)
    const filtered = enriched.filter((i: any) => categories.includes(i._status.category))
    res.json({ issues: filtered.slice(offset, offset + limit), count: filtered.length, limit, offset })
    return
  }

  const count = enriched.length
  res.json({ issues: enriched.slice(offset, offset + limit), count, limit, offset })
}
