import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { sseManager } from "@meridianjs/framework"
import { buildEmail, buildIssueUrl, htmlToEmailSafe, capitalize, userDisplayName } from "./_email-helper.js"

interface IssueMentionedData {
  issue_id: string
  actor_id: string
  mentioned_user_ids: string[]
  workspace_id: string
  project_id: string
}

export default async function handler({ event, container }: SubscriberArgs<IssueMentionedData>): Promise<void> {
  const data = event.data
  if (!data.mentioned_user_ids?.length) return

  const issueService = container.resolve("issueModuleService") as any
  const notifService = container.resolve("notificationModuleService") as any
  const userService = container.resolve("userModuleService") as any

  let issue: any
  try {
    issue = await issueService.retrieveIssue(data.issue_id)
  } catch {
    return
  }

  // Filter out the actor and deactivated users
  const candidates = data.mentioned_user_ids.filter((id) => id !== data.actor_id)
  if (candidates.length === 0) return

  const activeUserMap = await userService.listUsersByIds(candidates)
  const validMentions = candidates.filter((id: string) => activeUserMap.has(id))
  if (validMentions.length === 0) return

  try {
    await Promise.all(
      validMentions.map((userId: string) =>
        notifService.createNotification({
          user_id: userId,
          entity_type: "issue",
          entity_id: data.issue_id,
          action: "mentioned",
          message: `You were mentioned in the description of [${issue.identifier}]: ${issue.title}`,
          workspace_id: issue.workspace_id,
          metadata: { project_id: issue.project_id },
        })
      )
    )
  } catch (err) {
    const logger = container.resolve("logger") as any
    logger.error(`[notification] issue.mentioned: ${err instanceof Error ? err.message : String(err)}`)
  }

  sseManager.broadcast(issue.workspace_id, "notification.created", {})

  // ── Email ──────────────────────────────────────────────────────────────────
  try {
    const emailService = container.resolve("emailService") as any
    const config       = container.resolve("config") as any
    const appUrl: string = config?.appUrl ?? process.env.APP_URL ?? "http://localhost:9001"

    const issueUrl = await buildIssueUrl(container, appUrl, issue)

    // Fetch actor name (who mentioned them) and sanitize description
    let actorName = "Someone"
    try {
      const actor = await userService.retrieveUser(data.actor_id)
      actorName = userDisplayName(actor)
    } catch { /* fallback */ }

    const descSafeHtml = issue.description ? htmlToEmailSafe(issue.description) : ""
    const descPlainText = issue.description?.replace(/<[^>]+>/g, "").trim() ?? ""

    const meta = [
      ...(issue.priority ? [{ label: "Priority", value: capitalize(issue.priority) }] : []),
      ...(issue.type     ? [{ label: "Type",     value: capitalize(issue.type)     }] : []),
    ]

    const descQuote = descSafeHtml
      ? { label: `Description of ${issue.identifier}`, html: descSafeHtml }
      : undefined

    await Promise.allSettled(
      validMentions.map(async (userId: string) => {
        const user = await userService.retrieveUser(userId)
        if (!user?.email) return
        await emailService.send({
          to: user.email,
          subject: `You were mentioned in [${issue.identifier}]: ${issue.title}`,
          text: `${actorName} mentioned you in the description of ${issue.identifier}: "${issue.title}".\n\n${descPlainText}\n\nView it here: ${issueUrl}`,
          html: buildEmail({
            preheader: `${actorName} mentioned you in ${issue.identifier}: ${issue.title}`,
            heading: `You were mentioned in ${issue.identifier}`,
            body: `<strong>${actorName}</strong> mentioned you in the description of: <em>${issue.title}</em>`,
            meta,
            quote: descQuote,
            ctaText: "View Issue",
            ctaUrl: issueUrl,
          }),
        })
      })
    )
  } catch (err) {
    const logger = container.resolve("logger") as any
    logger.error(`[email] issue.mentioned: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const config: SubscriberConfig = { event: "issue.mentioned" }
