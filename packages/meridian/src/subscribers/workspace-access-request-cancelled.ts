import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { EVENTS } from "@meridianjs/types"
import { sseManager } from "@meridianjs/framework"

interface WorkspaceAccessRequestCancelledData {
  workspace_id: string
  user_id: string
  request_id: string
}

export default async function handler({ event }: SubscriberArgs<WorkspaceAccessRequestCancelledData>): Promise<void> {
  const data = event.data

  // SSE: update the workspace access-requests list for admins
  sseManager.broadcast(data.workspace_id, "workspace.access_request_cancelled", {
    workspace_id: data.workspace_id,
    request_id: data.request_id,
  })
}

export const config: SubscriberConfig = { event: EVENTS.WORKSPACE_ACCESS_REQUEST_CANCELLED }
