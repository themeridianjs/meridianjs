import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { sseManager } from "@meridianjs/framework"
import { buildEmail, buildIssueUrl, capitalize, userDisplayName, resolveTemplate } from "./_email-helper.js"

interface IssueAssignedData {
  issue_id: string
  project_id: string
  workspace_id: string
  actor_id: string
  assignee_ids: string[]
}

export default async function handler({ event, container }: SubscriberArgs<IssueAssignedData>): Promise<void> {
  const data = event.data
  if (!data.assignee_ids?.length) return

  const notifService = container.resolve("notificationModuleService") as any
  const userService = container.resolve("userModuleService") as any

  // Filter out deactivated users
  const candidateIds = data.assignee_ids.filter(id => id !== data.actor_id)
  const activeUserMap = await userService.listUsersByIds(candidateIds)
  const activeAssignees = candidateIds.filter(id => activeUserMap.has(id))

  try {
    await Promise.all(
      activeAssignees
        .map(userId =>
          notifService.createNotification({
            user_id: userId, entity_type: "issue", entity_id: data.issue_id,
            action: "assigned", message: "You were assigned to an issue",
            workspace_id: data.workspace_id,
            metadata: { project_id: data.project_id },
          })
        )
    )
  } catch (err) {
    const logger = container.resolve("logger") as any
    logger.error(`[notification] issue.assigned: ${err instanceof Error ? err.message : String(err)}`)
  }

  sseManager.broadcast(data.workspace_id, "issue.assigned", {
    issue_id: data.issue_id,
    assignee_ids: data.assignee_ids,
  })
  if (activeAssignees.length > 0) {
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

    // Fetch actor name (who did the assignment)
    let actorName = "A team member"
    try {
      const actor = await userService.retrieveUser(data.actor_id)
      actorName = userDisplayName(actor)
    } catch { /* fallback */ }

    const meta = [
      ...(issue.priority ? [{ label: "Priority", value: capitalize(issue.priority) }] : []),
      ...(issue.type     ? [{ label: "Type",     value: capitalize(issue.type)     }] : []),
    ]

    await Promise.allSettled(
      data.assignee_ids
        .filter(id => id !== data.actor_id)
        .map(async (userId: string) => {
          const user = await userService.retrieveUser(userId)
          if (!user?.email) return
          const tpl = resolveTemplate(container, "issue.assigned", { issue, user })
          await emailService.send({
            to: user.email,
            subject: tpl?.subject ?? `[${issue.identifier}] You've been assigned: ${issue.title}`,
            text: tpl?.text ?? `${actorName} assigned you to issue ${issue.identifier}: "${issue.title}".\n\nView it here: ${issueUrl}`,
            html: tpl?.html ?? buildEmail({
              preheader: `${actorName} assigned you to ${issue.identifier}: ${issue.title}`,
              heading: `You've been assigned to ${issue.identifier}`,
              body: `<strong>${actorName}</strong> assigned you to: <em>${issue.title}</em>`,
              meta,
              ctaText: "View Issue",
              ctaUrl: issueUrl,
            }),
          })
        })
    )
  } catch (err) {
    const logger = container.resolve("logger") as any
    logger.error(`[email] issue.assigned: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const config: SubscriberConfig = { event: "issue.assigned" }
