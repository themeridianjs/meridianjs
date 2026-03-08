import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { sseManager } from "@meridianjs/framework"
import { emailHtml, resolveTemplate } from "./_email-helper.js"

interface CommentCreatedData {
  comment_id: string
  issue_id: string
  author_id: string
  mentioned_user_ids?: string[]
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

  const userService = container.resolve("userModuleService") as any

  const recipients = new Set<string>()
  if (issue.assignee_ids) issue.assignee_ids.forEach((id: string) => recipients.add(id))
  if (issue.reporter_id) recipients.add(issue.reporter_id)
  recipients.delete(data.author_id)

  // Filter out deactivated users
  const activeUserMap = await userService.listUsersByIds([...recipients])
  const activeRecipients = [...recipients].filter(id => activeUserMap.has(id))

  try {
    await Promise.all(activeRecipients.map(userId =>
      notifService.createNotification({
        user_id: userId, entity_type: "issue", entity_id: data.issue_id,
        action: "commented", message: "Someone commented on an issue you're involved with",
        workspace_id: issue.workspace_id,
        metadata: { project_id: issue.project_id },
      })
    ))
  } catch (err) {
    const logger = container.resolve("logger") as any
    logger.error(`[notification] comment.created: ${err instanceof Error ? err.message : String(err)}`)
  }

  // Notify mentioned users (skip those already notified above)
  const mentionedIds = data.mentioned_user_ids ?? []
  const newMentionCandidates = mentionedIds.filter(id => id !== data.author_id && !recipients.has(id))
  // Filter out deactivated mentioned users
  const activeMentionMap = newMentionCandidates.length > 0
    ? await userService.listUsersByIds(newMentionCandidates)
    : new Map()
  const newMentions = newMentionCandidates.filter(id => activeMentionMap.has(id))

  try {
    await Promise.all(newMentions.map(userId =>
      notifService.createNotification({
        user_id: userId, entity_type: "issue", entity_id: data.issue_id,
        action: "mentioned", message: `You were mentioned in a comment on [${issue.identifier}]: ${issue.title}`,
        workspace_id: issue.workspace_id,
        metadata: { project_id: issue.project_id },
      })
    ))
  } catch (err) {
    const logger = container.resolve("logger") as any
    logger.error(`[notification] comment.created (mentions): ${err instanceof Error ? err.message : String(err)}`)
  }

  sseManager.broadcast(issue.workspace_id, "comment.created", {
    comment_id: data.comment_id,
    issue_id: data.issue_id,
  })

  // ── Email ──────────────────────────────────────────────────────────────────
  try {
    const emailService = container.resolve("emailService") as any
    const userService = container.resolve("userModuleService") as any
    const config = container.resolve("config") as any
    const appUrl: string = config?.appUrl ?? process.env.APP_URL ?? "http://localhost:9001"

    const commentLink = `${appUrl}/issues/${data.issue_id}#comment-${data.comment_id}`

    // Fetch comment body for inclusion in emails
    let commentBody = ""
    let commentBodyText = ""
    try {
      const comment = await issueService.retrieveComment(data.comment_id)
      commentBody = comment?.body ?? ""
      // Strip HTML tags for plain-text version
      commentBodyText = commentBody.replace(/<[^>]+>/g, "").trim()
    } catch { /* comment fetch optional — emails still send */ }

    // Email existing recipients (assignees / reporter)
    await Promise.allSettled([...recipients].map(async (userId) => {
      const user = await userService.retrieveUser(userId)
      if (!user?.email) return
      const tpl = resolveTemplate(container, "comment.created", { issue, user })
      await emailService.send({
        to: user.email,
        subject: tpl?.subject ?? `New comment on [${issue.identifier}]: ${issue.title}`,
        text: tpl?.text ?? `A comment was added on issue ${issue.identifier}: "${issue.title}" that you're involved with.\n\n${commentBodyText}`,
        html: tpl?.html ?? emailHtml(
          `A comment was added on issue <strong>${issue.identifier}</strong>: "${issue.title}" that you're involved with.` +
          (commentBody ? `<br><br><div style="border-left:3px solid #e2e8f0;padding:8px 12px;color:#374151;font-size:14px;">${commentBody}</div>` : "")
        ),
      })
    }))

    // Email mentioned users
    await Promise.allSettled(newMentions.map(async (userId) => {
      const user = await userService.retrieveUser(userId)
      if (!user?.email) return
      await emailService.send({
        to: user.email,
        subject: `You were mentioned in [${issue.identifier}]: ${issue.title}`,
        text: `You were mentioned in a comment on issue ${issue.identifier}: "${issue.title}".\n\n${commentBodyText}\n\nView it here: ${commentLink}`,
        html: emailHtml(
          `You were mentioned in a comment on <strong>${issue.identifier}</strong>: "${issue.title}".<br><br>` +
          (commentBody
            ? `<div style="border-left:3px solid #4f46e5;padding:8px 12px;color:#374151;font-size:14px;margin-bottom:16px;">${commentBody}</div>`
            : "") +
          `<a href="${commentLink}" style="color:#4f46e5">View comment →</a>`
        ),
      })
    }))
  } catch (err) {
    const logger = container.resolve("logger") as any
    logger.error(`[email] comment.created: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const config: SubscriberConfig = { event: "comment.created" }
