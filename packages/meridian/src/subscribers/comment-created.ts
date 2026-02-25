import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { sseManager } from "@meridianjs/framework"

interface CommentCreatedData {
  comment_id: string
  issue_id: string
  author_id: string
}

export default async function handler({ event, container }: SubscriberArgs<CommentCreatedData>): Promise<void> {
  const data = event.data
  const issueService = container.resolve("issueModuleService") as any
  const notifService = container.resolve("notificationModuleService") as any

  let issue: any
  try {
    issue = await issueService.retrieveIssue(data.issue_id)
  } catch {
    return
  }

  const recipients = new Set<string>()
  if (issue.assignee_ids) issue.assignee_ids.forEach((id: string) => recipients.add(id))
  if (issue.reporter_id) recipients.add(issue.reporter_id)
  recipients.delete(data.author_id)

  await Promise.all([...recipients].map(userId =>
    notifService.createNotification({
      user_id: userId, entity_type: "issue", entity_id: data.issue_id,
      action: "commented", message: "Someone commented on an issue you're involved with",
      workspace_id: issue.workspace_id,
    })
  ))

  sseManager.broadcast(issue.workspace_id, "comment.created", {
    comment_id: data.comment_id,
    issue_id: data.issue_id,
  })
}

export const config: SubscriberConfig = { event: "comment.created" }
