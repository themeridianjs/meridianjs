import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { sseManager } from "@meridianjs/framework"
import { emailHtml, resolveTemplate } from "./_email-helper.js"

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
  const data = event.data
  const recipients = new Set<string>()
  if (data.assignee_ids) data.assignee_ids.forEach(id => recipients.add(id))
  if (data.reporter_id && data.reporter_id !== data.actor_id) recipients.add(data.reporter_id)

  await Promise.all([...recipients].map(userId =>
    notifService.createNotification({
      user_id: userId, entity_type: "issue", entity_id: data.issue_id,
      action: "created",
      message: data.assignee_ids?.includes(userId) ? "You were assigned to a new issue" : "An issue was created in your project",
      workspace_id: data.workspace_id,
      metadata: { project_id: data.project_id },
    })
  ))

  sseManager.broadcast(data.workspace_id, "issue.created", {
    issue_id: data.issue_id,
    project_id: data.project_id,
  })

  // ── Email ──────────────────────────────────────────────────────────────────
  try {
    const emailService = container.resolve("emailService") as any
    const userService  = container.resolve("userModuleService") as any
    const issueService = container.resolve("issueModuleService") as any
    const issue = await issueService.retrieveIssue(data.issue_id)

    const recipientIds = new Set<string>()
    if (data.assignee_ids) data.assignee_ids.forEach(id => recipientIds.add(id))
    if (data.reporter_id && data.reporter_id !== data.actor_id) recipientIds.add(data.reporter_id)

    await Promise.allSettled([...recipientIds].map(async (userId) => {
      const user = await userService.retrieveUser(userId)
      if (!user?.email) return
      const isAssignee = data.assignee_ids?.includes(userId)
      const tpl = resolveTemplate(container, "issue.created", { issue, user, isAssignee: !!isAssignee })
      await emailService.send({
        to: user.email,
        subject: tpl?.subject ?? `New issue: [${issue.identifier}] ${issue.title}`,
        text: tpl?.text ?? (isAssignee
          ? `You've been assigned to new issue ${issue.identifier}: "${issue.title}".`
          : `A new issue ${issue.identifier} was created: "${issue.title}".`),
        html: tpl?.html ?? emailHtml(isAssignee
          ? `You've been assigned to new issue <strong>${issue.identifier}</strong>: "${issue.title}".`
          : `A new issue <strong>${issue.identifier}</strong> was created: "${issue.title}".`),
      })
    }))
  } catch (err) {
    console.error("[email] issue.created:", err)
  }
}

export const config: SubscriberConfig = { event: "issue.created" }
