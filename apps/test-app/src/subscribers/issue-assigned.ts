import type { SubscriberArgs, SubscriberConfig } from "@meridian/types"

interface IssueAssignedData {
  issue_id: string
  workspace_id: string
  actor_id: string
  assignee_id: string | null
}

/**
 * When an issue is assigned (or unassigned), notify the new assignee.
 * No notification is sent for unassignment.
 */
export default async function handler({
  event,
  container,
}: SubscriberArgs<IssueAssignedData>): Promise<void> {
  const data = event.data

  // Only notify when there is a new assignee (not on unassignment)
  if (!data.assignee_id) return
  // Don't notify if the user assigned themselves
  if (data.assignee_id === data.actor_id) return

  const notifService = container.resolve("notificationModuleService") as any

  await notifService.createNotification({
    user_id: data.assignee_id,
    entity_type: "issue",
    entity_id: data.issue_id,
    action: "assigned",
    message: "You were assigned to an issue",
    workspace_id: data.workspace_id,
  })
}

export const config: SubscriberConfig = {
  event: "issue.assigned",
}
