import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
  transform,
} from "@meridian/workflow-engine"
import { emitEventStep } from "./emit-event.js"

// ─── Input / Output types ────────────────────────────────────────────────────

export interface AssignIssueInput {
  issueId: string
  assignee_id: string | null
  actor_id?: string | null
}

// ─── Steps ───────────────────────────────────────────────────────────────────

const fetchIssueForAssignStep = createStep(
  "fetch-issue-for-assign",
  async (input: AssignIssueInput, { container }) => {
    const svc = container.resolve("issueModuleService") as any
    const issue = await svc.retrieveIssue(input.issueId)
    return { issue, newAssignee: input.assignee_id, actor_id: input.actor_id }
  }
)

const setAssigneeStep = createStep(
  "set-issue-assignee",
  async (
    input: { issue: any; newAssignee: string | null; actor_id?: string | null },
    { container }
  ) => {
    const svc = container.resolve("issueModuleService") as any
    const updated = await svc.updateIssue(input.issue.id, {
      assignee_id: input.newAssignee,
    })
    return new StepResponse(updated, {
      issueId: input.issue.id,
      previousAssignee: input.issue.assignee_id,
    })
  },
  // Compensate: restore the previous assignee
  async ({ issueId, previousAssignee }, { container }) => {
    const svc = container.resolve("issueModuleService") as any
    await svc.updateIssue(issueId, { assignee_id: previousAssignee })
  }
)

const logAssignedStep = createStep(
  "log-issue-assigned",
  async (
    input: {
      entity_id: string
      actor_id: string
      workspace_id: string
      assignee_id: string | null
    },
    { container }
  ) => {
    const svc = container.resolve("activityModuleService") as any
    await svc.recordActivity({
      entity_type: "issue",
      entity_id: input.entity_id,
      actor_id: input.actor_id,
      action: input.assignee_id ? "assigned" : "unassigned",
      workspace_id: input.workspace_id,
      changes: { assignee_id: { to: input.assignee_id } },
    })
  }
)

// ─── Workflow ─────────────────────────────────────────────────────────────────

export const assignIssueWorkflow = createWorkflow(
  "assign-issue",
  async (input: AssignIssueInput) => {
    const { issue, newAssignee, actor_id } = await fetchIssueForAssignStep(input)
    const updated = await setAssigneeStep({ issue, newAssignee, actor_id })

    const activityInput = transform(updated, (u) => ({
      entity_id: u.id,
      actor_id: actor_id ?? "system",
      workspace_id: u.workspace_id,
      assignee_id: newAssignee,
    }))
    await logAssignedStep(activityInput)

    await emitEventStep({
      name: "issue.assigned",
      data: {
        issue_id: updated.id,
        workspace_id: updated.workspace_id,
        actor_id: actor_id ?? "system",
        assignee_id: newAssignee,
      },
    })

    return new WorkflowResponse(updated)
  }
)
