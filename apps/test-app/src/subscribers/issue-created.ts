import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"

interface IssueCreatedData {
  issue_id: string
  project_id: string
  workspace_id: string
  actor_id: string
  assignee_id: string | null
  reporter_id: string | null
}

/**
 * When an issue is created, notify:
 * - The assignee (if one was set at creation)
 * - The reporter (if different from the actor who created it)
 */
export default async function handler({
  event,
  container,
}: SubscriberArgs<IssueCreatedData>): Promise<void> {
  const notifService = container.resolve("notificationModuleService") as any
  const data = event.data

  const recipients = new Set<string>()

  if (data.assignee_id) recipients.add(data.assignee_id)
  // Notify reporter if they didn't create it themselves
  if (data.reporter_id && data.reporter_id !== data.actor_id) {
    recipients.add(data.reporter_id)
  }

  await Promise.all(
    [...recipients].map((userId) =>
      notifService.createNotification({
        user_id: userId,
        entity_type: "issue",
        entity_id: data.issue_id,
        action: "created",
        message: userId === data.assignee_id
          ? "You were assigned to a new issue"
          : "An issue was created in your project",
        workspace_id: data.workspace_id,
      })
    )
  )
}

export const config: SubscriberConfig = {
  event: "issue.created",
}
