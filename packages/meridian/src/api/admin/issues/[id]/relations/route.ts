import type { Response } from "express"
import { assertIssueAccess } from "../../../../utils/issue-access.js"

export const GET = async (req: any, res: Response) => {
  const issue = await assertIssueAccess(req, res)
  if (!issue) return
  const issueService = req.scope.resolve("issueModuleService") as any

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
