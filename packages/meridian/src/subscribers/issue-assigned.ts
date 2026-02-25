import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { sseManager } from "@meridianjs/framework"

interface IssueAssignedData {
  issue_id: string
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
        })
      )
  )

  sseManager.broadcast(data.workspace_id, "issue.assigned", {
    issue_id: data.issue_id,
    assignee_ids: data.assignee_ids,
  })
}

export const config: SubscriberConfig = { event: "issue.assigned" }
