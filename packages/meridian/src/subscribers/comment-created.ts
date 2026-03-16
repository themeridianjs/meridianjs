import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { sseManager } from "@meridianjs/framework"
import { buildEmail, buildIssueUrl, htmlToEmailSafe, capitalize, userDisplayName, resolveTemplate } from "./_email-helper.js"

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
  if (activeRecipients.length > 0 || newMentions.length > 0) {
    sseManager.broadcast(issue.workspace_id, "notification.created", {})
  }

  // ── Email ──────────────────────────────────────────────────────────────────
  try {
    const emailService = container.resolve("emailService") as any
    const userService  = container.resolve("userModuleService") as any
    const config       = container.resolve("config") as any
    const appUrl: string = config?.appUrl ?? process.env.APP_URL ?? "http://localhost:9001"

    const issueUrl = await buildIssueUrl(container, appUrl, issue)

    // Fetch comment body + author name
    let commentSafeHtml = ""
    let commentPlainText = ""
    let authorName = "Someone"
    try {
      const comment = await issueService.retrieveComment(data.comment_id)
      commentSafeHtml = comment?.body ? htmlToEmailSafe(comment.body) : ""
      commentPlainText = comment?.body?.replace(/<[^>]+>/g, "").trim() ?? ""
    } catch { /* comment fetch optional */ }
    try {
      const author = await userService.retrieveUser(data.author_id)
      authorName = userDisplayName(author)
    } catch { /* fallback */ }

    const meta = [
      ...(issue.priority ? [{ label: "Priority", value: capitalize(issue.priority) }] : []),
      ...(issue.type     ? [{ label: "Type",     value: capitalize(issue.type)     }] : []),
    ]

    const commentQuote = commentSafeHtml
      ? { label: `Comment by ${authorName}`, html: commentSafeHtml }
      : undefined

    // Email existing recipients (assignees / reporter)
    await Promise.allSettled([...recipients].map(async (userId) => {
      const user = await userService.retrieveUser(userId)
      if (!user?.email) return
      const tpl = resolveTemplate(container, "comment.created", { issue, user })
      await emailService.send({
        to: user.email,
        subject: tpl?.subject ?? `New comment on [${issue.identifier}]: ${issue.title}`,
        text: tpl?.text ?? `${authorName} left a comment on ${issue.identifier}: "${issue.title}".\n\n${commentPlainText}\n\nView it here: ${issueUrl}`,
        html: tpl?.html ?? buildEmail({
          preheader: `${authorName} commented on ${issue.identifier}: ${issue.title}`,
          heading: `New comment on ${issue.identifier}`,
          body: `<strong>${authorName}</strong> left a comment on: <em>${issue.title}</em>`,
          meta,
          quote: commentQuote,
          ctaText: "View Issue",
          ctaUrl: issueUrl,
        }),
      })
    }))

    // Email mentioned users
    await Promise.allSettled(newMentions.map(async (userId) => {
      const user = await userService.retrieveUser(userId)
      if (!user?.email) return
      await emailService.send({
        to: user.email,
        subject: `You were mentioned in [${issue.identifier}]: ${issue.title}`,
        text: `${authorName} mentioned you in a comment on ${issue.identifier}: "${issue.title}".\n\n${commentPlainText}\n\nView it here: ${issueUrl}`,
        html: buildEmail({
          preheader: `${authorName} mentioned you in ${issue.identifier}: ${issue.title}`,
          heading: `You were mentioned in ${issue.identifier}`,
          body: `<strong>${authorName}</strong> mentioned you in a comment on: <em>${issue.title}</em>`,
          meta,
          quote: commentQuote,
          ctaText: "View Comment",
          ctaUrl: issueUrl,
        }),
      })
    }))
  } catch (err) {
    const logger = container.resolve("logger") as any
    logger.error(`[email] comment.created: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const config: SubscriberConfig = { event: "comment.created" }
