import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { EVENTS } from "@meridianjs/types"
import { sseManager } from "@meridianjs/framework"

interface IssueStatusChangedData {
  issue_id: string
  project_id?: string
  workspace_id: string
  actor_id: string
  new_status: string
}

export default async function handler({ event }: SubscriberArgs<IssueStatusChangedData>): Promise<void> {
  const data = event.data
  sseManager.broadcast(data.workspace_id, "issue.status_changed", {
    issue_id: data.issue_id,
    project_id: data.project_id,
    new_status: data.new_status,
  })
}

export const config: SubscriberConfig = { event: EVENTS.ISSUE_STATUS_CHANGED }
