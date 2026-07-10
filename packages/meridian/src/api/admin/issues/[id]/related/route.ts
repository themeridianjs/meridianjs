import type { Response } from "express"
import { assertIssueAccess } from "../../../../utils/issue-access.js"

export const GET = async (req: any, res: Response) => {
  const issue = await assertIssueAccess(req, res)
  if (!issue) return
  const issueService = req.scope.resolve("issueModuleService") as any

  // Calculate depth by walking the parent chain
  let depth = 0
  let currentId = issue.parent_id
  while (currentId) {
    depth++
    const parent = await issueService.retrieveIssue(currentId).catch(() => null)
    if (!parent) break
    currentId = parent.parent_id
  }

  // Get parent
  const parent = issue.parent_id
    ? await issueService.retrieveIssue(issue.parent_id).catch(() => null)
    : null

  // Get children
  const [children] = await issueService.listAndCountIssues(
    { parent_id: req.params.id },
    { limit: 200, orderBy: { created_at: "ASC" } }
  )

  res.json({ parent, children, depth })
}
