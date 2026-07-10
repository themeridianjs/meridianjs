import type { Response } from "express"
import { requirePermission } from "@meridianjs/auth"
import { assertIssueAccess } from "../../../../utils/issue-access.js"

export const GET = async (req: any, res: Response) => {
  if (!await assertIssueAccess(req, res)) return
  const issueService = req.scope.resolve("issueModuleService") as any
  const comments = await issueService.listCommentsByIssue(req.params.id)
  res.json({ comments })
}

export const POST = async (req: any, res: Response) => {
  requirePermission("issue:create")(req, res, async () => {
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
    const mentionedUserIds: string[] = Array.isArray(metadata?.mentioned_user_ids)
      ? metadata.mentioned_user_ids.filter((id: unknown) => typeof id === "string")
      : []
    eventBus.emit({ name: "comment.created", data: { comment_id: comment.id, issue_id: req.params.id, author_id: comment.author_id, mentioned_user_ids: mentionedUserIds } }).catch(() => {})
    res.status(201).json({ comment })
  })
}
