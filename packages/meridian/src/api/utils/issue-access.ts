import type { Response } from "express"
import { hasProjectAccess, isGlobalAdmin } from "./project-access.js"

/**
 * Loads the issue at req.params.id and enforces project-level access.
 *
 * Returns the issue when the caller may proceed. Sends the response (404 when
 * the issue is missing, 403 when access is denied) and returns null otherwise.
 *
 * Fails closed: an issue whose project row cannot be resolved (dangling
 * project_id) is only accessible to global admins.
 *
 * Usage:
 *   const issue = await assertIssueAccess(req, res)
 *   if (!issue) return
 */
export async function assertIssueAccess(req: any, res: Response): Promise<any | null> {
  const issueService = req.scope.resolve("issueModuleService") as any
  const issue = await issueService.retrieveIssue(req.params.id).catch(() => null)
  if (!issue) {
    res.status(404).json({ error: { message: "Issue not found" } })
    return null
  }

  if (issue.project_id) {
    const projectService = req.scope.resolve("projectModuleService") as any
    const project = await projectService.retrieveProject(issue.project_id).catch(() => null)

    if (!project) {
      if (!isGlobalAdmin(req)) {
        res.status(403).json({ error: { message: "Forbidden" } })
        return null
      }
    } else if (!(await hasProjectAccess(req, project))) {
      res.status(403).json({ error: { message: "Forbidden" } })
      return null
    }
  }

  return issue
}
