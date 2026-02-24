import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const comments = await issueService.listCommentsByIssue(req.params.id)
  res.json({ comments })
}

export const POST = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const eventBus = req.scope.resolve("eventBus") as any
  const { body } = req.body
  if (!body || typeof body !== "string" || body.trim().length === 0) {
    res.status(400).json({ error: { message: "body is required" } })
    return
  }
  const comment = await issueService.createComment({
    issue_id: req.params.id, body: body.trim(), author_id: req.user?.id ?? "system",
  })
  eventBus.emit({ name: "comment.created", data: { comment_id: comment.id, issue_id: req.params.id, author_id: comment.author_id } }).catch(() => {})
  res.status(201).json({ comment })
}
