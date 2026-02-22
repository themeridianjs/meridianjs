import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
  transform,
} from "@meridian/workflow-engine"

// ─── Input / Output types ────────────────────────────────────────────────────

export interface UpdateIssueStatusInput {
  issueId: string
  status: string
  actor_id?: string | null
}

// ─── Steps ───────────────────────────────────────────────────────────────────

const fetchIssueStep = createStep(
  "fetch-issue-for-status-update",
  async (input: UpdateIssueStatusInput, { container }) => {
    const svc = container.resolve("issueModuleService") as any
    const issue = await svc.retrieveIssue(input.issueId)
    return { issue, newStatus: input.status, actor_id: input.actor_id }
  }
)

const setIssueStatusStep = createStep(
  "set-issue-status",
  async (
    input: { issue: any; newStatus: string; actor_id?: string | null },
    { container }
  ) => {
    const svc = container.resolve("issueModuleService") as any
    const updated = await svc.updateIssue(input.issue.id, {
      status: input.newStatus,
    })
    return new StepResponse(updated, {
      issueId: input.issue.id,
      previousStatus: input.issue.status,
    })
  },
  // Compensate: restore the previous status
  async ({ issueId, previousStatus }, { container }) => {
    const svc = container.resolve("issueModuleService") as any
    await svc.updateIssue(issueId, { status: previousStatus })
  }
)

const logStatusChangedStep = createStep(
  "log-issue-status-changed",
  async (
    input: {
      entity_id: string
      actor_id: string
      workspace_id: string
      newStatus: string
    },
    { container }
  ) => {
    const svc = container.resolve("activityModuleService") as any
    await svc.recordActivity({
      entity_type: "issue",
      entity_id: input.entity_id,
      actor_id: input.actor_id,
      action: "status_changed",
      workspace_id: input.workspace_id,
      changes: { status: { to: input.newStatus } },
    })
  }
)

// ─── Workflow ─────────────────────────────────────────────────────────────────

export const updateIssueStatusWorkflow = createWorkflow(
  "update-issue-status",
  async (input: UpdateIssueStatusInput) => {
    const { issue, newStatus, actor_id } = await fetchIssueStep(input)
    const updated = await setIssueStatusStep({ issue, newStatus, actor_id })

    const activityInput = transform(updated, (u) => ({
      entity_id: u.id,
      actor_id: actor_id ?? "system",
      workspace_id: u.workspace_id,
      newStatus,
    }))
    await logStatusChangedStep(activityInput)

    return new WorkflowResponse(updated)
  }
)
