import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const projectService = req.scope.resolve("projectModuleService") as any
  const issueService = req.scope.resolve("issueModuleService") as any
  const userService = req.scope.resolve("userModuleService") as any

  const project = await projectService.retrieveProjectByShareToken(req.params.token)
  if (!project) {
    res.status(404).json({ error: { message: "Share link not found or expired" } })
    return
  }

  const filters: Record<string, unknown> = { project_id: project.id }
  if (req.query.status) filters.status = req.query.status
  if (req.query.priority) filters.priority = req.query.priority

  const limit = Math.min(Number(req.query.limit) || 100, 200)
  const offset = Number(req.query.offset) || 0

  let [issues] = await issueService.listAndCountIssues(filters, { limit, offset, orderBy: { created_at: "ASC" } })

  // Apply search filter in-memory (simple title match)
  if (req.query.search) {
    const q = (req.query.search as string).toLowerCase()
    issues = issues.filter((i: any) => i.title?.toLowerCase().includes(q))
  }

  // Strip sensitive data from assignees — return only { id, name, initials }
  const sanitized = await Promise.all(
    issues.map(async (issue: any) => {
      const assignees = await Promise.all(
        (issue.assignee_ids ?? []).map(async (uid: string) => {
          try {
            const u = await userService.retrieveUser(uid)
            const name = [u.first_name, u.last_name].filter(Boolean).join(" ")
            const initials = [u.first_name?.[0], u.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "?"
            return { id: u.id, name, initials }
          } catch {
            return { id: uid, name: "Unknown", initials: "?" }
          }
        })
      )
      return { ...issue, assignees }
    })
  )

  res.json({ issues: sanitized, count: sanitized.length })
}
