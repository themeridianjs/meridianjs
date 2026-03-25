import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const issue = await issueService.retrieveIssue(req.params.id).catch(() => null)
  if (!issue) {
    res.status(404).json({ error: { message: "Issue not found" } })
    return
  }

  const fetchByIds = async (ids: string[]) => {
    const results = await Promise.all(
      ids.map((id) => issueService.retrieveIssue(id).catch(() => null))
    )
    return results.filter(Boolean)
  }

  const [depends_on, related_to] = await Promise.all([
    fetchByIds(Array.isArray(issue.depends_on_ids) ? issue.depends_on_ids : []),
    fetchByIds(Array.isArray(issue.related_to_ids) ? issue.related_to_ids : []),
  ])

  res.json({ depends_on, related_to })
}
