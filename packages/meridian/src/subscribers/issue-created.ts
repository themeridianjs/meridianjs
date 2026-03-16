import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { sseManager } from "@meridianjs/framework"
import { buildEmail, buildIssueUrl, capitalize, resolveTemplate } from "./_email-helper.js"

interface IssueCreatedData {
  issue_id: string
  project_id: string
  workspace_id: string
  actor_id: string
  assignee_ids: string[] | null
  reporter_id: string | null
}

export default async function handler({ event, container }: SubscriberArgs<IssueCreatedData>): Promise<void> {
  const notifService = container.resolve("notificationModuleService") as any
  const userService = container.resolve("userModuleService") as any
  const data = event.data
  const recipients = new Set<string>()
  if (data.assignee_ids) data.assignee_ids.forEach(id => recipients.add(id))
  if (data.reporter_id && data.reporter_id !== data.actor_id) recipients.add(data.reporter_id)

  // Filter out deactivated users
  const activeUserMap = await userService.listUsersByIds([...recipients])
  const activeRecipients = [...recipients].filter(id => activeUserMap.has(id))

  try {
    await Promise.all(activeRecipients.map(userId =>
      notifService.createNotification({
        user_id: userId, entity_type: "issue", entity_id: data.issue_id,
        action: "created",
        message: data.assignee_ids?.includes(userId) ? "You were assigned to a new issue" : "An issue was created in your project",
        workspace_id: data.workspace_id,
        metadata: { project_id: data.project_id },
      })
    ))
  } catch (err) {
    const logger = container.resolve("logger") as any
    logger.error(`[notification] issue.created: ${err instanceof Error ? err.message : String(err)}`)
  }

  sseManager.broadcast(data.workspace_id, "issue.created", {
    issue_id: data.issue_id,
    project_id: data.project_id,
  })
  if (activeRecipients.length > 0) {
    sseManager.broadcast(data.workspace_id, "notification.created", {})
  }

  // ── Email ──────────────────────────────────────────────────────────────────
  try {
    const emailService = container.resolve("emailService") as any
    const userService  = container.resolve("userModuleService") as any
    const issueService = container.resolve("issueModuleService") as any
    const config       = container.resolve("config") as any
    const appUrl: string = config?.appUrl ?? process.env.APP_URL ?? "http://localhost:9001"
    const issue = await issueService.retrieveIssue(data.issue_id)
    const issueUrl = await buildIssueUrl(container, appUrl, issue)

    const recipientIds = new Set<string>()
    if (data.assignee_ids) data.assignee_ids.forEach(id => recipientIds.add(id))
    if (data.reporter_id && data.reporter_id !== data.actor_id) recipientIds.add(data.reporter_id)

    const meta = [
      ...(issue.priority ? [{ label: "Priority", value: capitalize(issue.priority) }] : []),
      ...(issue.type     ? [{ label: "Type",     value: capitalize(issue.type)     }] : []),
    ]

    await Promise.allSettled([...recipientIds].map(async (userId) => {
      const user = await userService.retrieveUser(userId)
      if (!user?.email) return
      const isAssignee = data.assignee_ids?.includes(userId)
      const tpl = resolveTemplate(container, "issue.created", { issue, user, isAssignee: !!isAssignee })
      await emailService.send({
        to: user.email,
        subject: tpl?.subject ?? `New issue: [${issue.identifier}] ${issue.title}`,
        text: tpl?.text ?? (isAssignee
          ? `You've been assigned to new issue ${issue.identifier}: "${issue.title}".\n\nView it here: ${issueUrl}`
          : `A new issue ${issue.identifier} was created: "${issue.title}".\n\nView it here: ${issueUrl}`),
        html: tpl?.html ?? buildEmail({
          preheader: isAssignee
            ? `You've been assigned to ${issue.identifier}: ${issue.title}`
            : `New issue ${issue.identifier}: ${issue.title}`,
          heading: isAssignee ? `You've been assigned to ${issue.identifier}` : `New issue: ${issue.identifier}`,
          body: isAssignee
            ? `You've been assigned to: <em>${issue.title}</em>`
            : `A new issue was created: <em>${issue.title}</em>`,
          meta,
          ctaText: "View Issue",
          ctaUrl: issueUrl,
        }),
      })
    }))
  } catch (err) {
    const logger = container.resolve("logger") as any
    logger.error(`[email] issue.created: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const config: SubscriberConfig = { event: "issue.created" }
