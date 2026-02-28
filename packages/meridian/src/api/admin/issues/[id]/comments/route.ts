import type { Response } from "express"
import { hasProjectAccess } from "../../../../utils/project-access.js"

async function assertIssueAccess(req: any, res: Response): Promise<boolean> {
  const issueService = req.scope.resolve("issueModuleService") as any
  const issue = await issueService.retrieveIssue(req.params.id).catch(() => null)
  if (!issue) {
    res.status(404).json({ error: { message: "Issue not found" } })
    return false
  }
  if (issue.project_id) {
    const projectService = req.scope.resolve("projectModuleService") as any
    const project = await projectService.retrieveProject(issue.project_id).catch(() => null)
    if (project && !await hasProjectAccess(req, project)) {
      res.status(403).json({ error: { message: "Forbidden" } })
      return false
    }
  }
  return true
}

export const GET = async (req: any, res: Response) => {
  if (!await assertIssueAccess(req, res)) return
  const issueService = req.scope.resolve("issueModuleService") as any
  const comments = await issueService.listCommentsByIssue(req.params.id)
  res.json({ comments })
}

export const POST = async (req: any, res: Response) => {
  if (!await assertIssueAccess(req, res)) return
  const issueService = req.scope.resolve("issueModuleService") as any
  const eventBus = req.scope.resolve("eventBus") as any
  const { body, metadata } = req.body
  if (!body || typeof body !== "string" || body.trim().length === 0) {
    res.status(400).json({ error: { message: "body is required" } })
    return
  }
  const comment = await issueService.createComment({
    issue_id: req.params.id, body: body.trim(), author_id: req.user?.id ?? "system",
    metadata: metadata ?? null,
  })
  eventBus.emit({ name: "comment.created", data: { comment_id: comment.id, issue_id: req.params.id, author_id: comment.author_id } }).catch(() => {})
  res.status(201).json({ comment })
}
