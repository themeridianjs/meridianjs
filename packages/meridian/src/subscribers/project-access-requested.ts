import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { EVENTS } from "@meridianjs/types"
import { sseManager } from "@meridianjs/framework"

interface ProjectAccessRequestedData {
  project_id: string
  workspace_id: string
  user_id: string
  request_id: string
}

export default async function handler({ event }: SubscriberArgs<ProjectAccessRequestedData>): Promise<void> {
  const data = event.data

  // SSE: update the project access-requests badge for managers/admins
  sseManager.broadcast(data.workspace_id, "project.access_requested", {
    project_id: data.project_id,
    request_id: data.request_id,
  })
  sseManager.broadcast(data.workspace_id, "notification.created", {})
}

export const config: SubscriberConfig = { event: EVENTS.PROJECT_ACCESS_REQUESTED }
