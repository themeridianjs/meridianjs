import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
  transform,
} from "@meridianjs/workflow-engine"
import { emitEventStep } from "./emit-event.js"

export interface UpdateIssueStatusInput {
  issueId: string
  status: string
  actor_id?: string | null
}

const fetchIssueStep = createStep(
  "fetch-issue-for-status-update",
  async (input: UpdateIssueStatusInput, { container }) => {
    const svc = container.resolve("issueModuleService") as any
    const issue = await svc.retrieveIssue(input.issueId)
    return { issue, newStatus: input.status, actor_id: input.actor_id, oldStatus: issue.status }
  }
)

const setIssueStatusStep = createStep(
  "set-issue-status",
  async (input: { issue: any; newStatus: string; actor_id?: string | null }, { container }) => {
    const svc = container.resolve("issueModuleService") as any
    const updated = await svc.updateIssue(input.issue.id, { status: input.newStatus })
    return new StepResponse(updated, { issueId: input.issue.id, previousStatus: input.issue.status })
  },
  async ({ issueId, previousStatus }, { container }) => {
    const svc = container.resolve("issueModuleService") as any
    await svc.updateIssue(issueId, { status: previousStatus })
  }
)

const logStatusChangedStep = createStep(
  "log-issue-status-changed",
  async (
    input: { entity_id: string; actor_id: string; workspace_id: string; newStatus: string; oldStatus: string },
    { container }
  ) => {
    const svc = container.resolve("activityModuleService") as any
    await svc.recordActivity({
      entity_type: "issue", entity_id: input.entity_id,
      actor_id: input.actor_id, action: "status_changed", workspace_id: input.workspace_id,
      changes: { status: { from: input.oldStatus, to: input.newStatus } },
    })
  }
)

export const updateIssueStatusWorkflow = createWorkflow(
  "update-issue-status",
  async (input: UpdateIssueStatusInput) => {
    const { issue, newStatus, actor_id, oldStatus } = await fetchIssueStep(input)
    const updated = await setIssueStatusStep({ issue, newStatus, actor_id })
    const activityInput = transform(updated, (u) => ({
      entity_id: u.id, actor_id: actor_id ?? "system",
      workspace_id: u.workspace_id, newStatus, oldStatus,
    }))
    await logStatusChangedStep(activityInput)
    await emitEventStep({
      name: "issue.status_changed",
      data: { issue_id: updated.id, workspace_id: updated.workspace_id, actor_id: actor_id ?? "system", new_status: newStatus },
    })
    return new WorkflowResponse(updated)
  }
)
