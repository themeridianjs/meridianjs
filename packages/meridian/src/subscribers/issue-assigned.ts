import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { sseManager } from "@meridianjs/framework"
import { emailHtml } from "./_email-helper.js"

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

  await Promise.all(
    data.assignee_ids
      .filter(id => id !== data.actor_id)
      .map(userId =>
        notifService.createNotification({
          user_id: userId, entity_type: "issue", entity_id: data.issue_id,
          action: "assigned", message: "You were assigned to an issue",
          workspace_id: data.workspace_id,
          metadata: { project_id: data.project_id },
        })
      )
  )

  sseManager.broadcast(data.workspace_id, "issue.assigned", {
    issue_id: data.issue_id,
    assignee_ids: data.assignee_ids,
  })

  // ── Email ──────────────────────────────────────────────────────────────────
  try {
    const emailService = container.resolve("emailService") as any
    const userService  = container.resolve("userModuleService") as any
    const issueService = container.resolve("issueModuleService") as any
    const issue = await issueService.retrieveIssue(data.issue_id)

    await Promise.allSettled(
      data.assignee_ids
        .filter(id => id !== data.actor_id)
        .map(async (userId: string) => {
          const user = await userService.retrieveUser(userId)
          if (!user?.email) return
          await emailService.send({
            to: user.email,
            subject: `[${issue.identifier}] You've been assigned: ${issue.title}`,
            text: `You've been assigned to issue ${issue.identifier}: "${issue.title}".`,
            html: emailHtml(`You've been assigned to <strong>${issue.identifier}</strong>: "${issue.title}".`),
          })
        })
    )
  } catch (err) {
    console.error("[email] issue.assigned:", err)
  }
}

export const config: SubscriberConfig = { event: "issue.assigned" }
