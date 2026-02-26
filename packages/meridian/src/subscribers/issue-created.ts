import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { sseManager } from "@meridianjs/framework"

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
}

export const config: SubscriberConfig = { event: "issue.created" }
