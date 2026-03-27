import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { sseManager } from "@meridianjs/framework"

interface ProjectAccessRequestCancelledData {
  project_id: string
  workspace_id: string
  user_id: string
  request_id: string
}

export default async function handler({ event }: SubscriberArgs<ProjectAccessRequestCancelledData>): Promise<void> {
  const data = event.data

  // SSE: update the project access-requests badge for managers/admins
  sseManager.broadcast(data.workspace_id, "project.access_request_cancelled", {
    project_id: data.project_id,
    request_id: data.request_id,
  })
}

export const config: SubscriberConfig = { event: "project.access_request_cancelled" }
