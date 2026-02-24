import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"

interface CommentCreatedData {
  comment_id: string
  issue_id: string
  author_id: string
}

/**
 * When a comment is posted on an issue, notify the issue's assignee and reporter
 * (fetched live from the issue service) — but not the comment author themselves.
 */
export default async function handler({
  event,
  container,
}: SubscriberArgs<CommentCreatedData>): Promise<void> {
  const data = event.data
  const issueService = container.resolve("issueModuleService") as any
  const notifService = container.resolve("notificationModuleService") as any

  let issue: any
  try {
    issue = await issueService.retrieveIssue(data.issue_id)
  } catch {
    // Issue may have been deleted — skip silently
    return
  }

  const recipients = new Set<string>()
  if (issue.assignee_id) recipients.add(issue.assignee_id)
  if (issue.reporter_id) recipients.add(issue.reporter_id)
  // Don't notify the comment author
  recipients.delete(data.author_id)

  await Promise.all(
    [...recipients].map((userId) =>
      notifService.createNotification({
        user_id: userId,
        entity_type: "issue",
        entity_id: data.issue_id,
        action: "commented",
        message: "Someone commented on an issue you're involved with",
        workspace_id: issue.workspace_id,
      })
    )
  )
}

export const config: SubscriberConfig = {
  event: "comment.created",
}
