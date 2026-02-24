import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
  transform,
} from "@meridianjs/workflow-engine"
import { emitEventStep } from "./emit-event.js"

// ─── Input / Output types ────────────────────────────────────────────────────

export interface AssignIssueInput {
  issueId: string
  /** Full replacement list of assignee user IDs. Pass [] to unassign everyone. */
  assignee_ids: string[]
  actor_id?: string | null
}

// ─── Steps ───────────────────────────────────────────────────────────────────

const fetchIssueForAssignStep = createStep(
  "fetch-issue-for-assign",
  async (input: AssignIssueInput, { container }) => {
    const svc = container.resolve("issueModuleService") as any
    const issue = await svc.retrieveIssue(input.issueId)
    return { issue, newAssignees: input.assignee_ids, actor_id: input.actor_id, oldAssignees: issue.assignee_ids ?? [] }
  }
)

const setAssigneesStep = createStep(
  "set-issue-assignees",
  async (
    input: { issue: any; newAssignees: string[]; actor_id?: string | null },
    { container }
  ) => {
    const svc = container.resolve("issueModuleService") as any
    const updated = await svc.updateIssue(input.issue.id, {
      assignee_ids: input.newAssignees,
    })
    return new StepResponse(updated, {
      issueId: input.issue.id,
      previousAssignees: input.issue.assignee_ids ?? [],
    })
  },
  // Compensate: restore the previous assignees
  async ({ issueId, previousAssignees }, { container }) => {
    const svc = container.resolve("issueModuleService") as any
    await svc.updateIssue(issueId, { assignee_ids: previousAssignees })
  }
)

const logAssigneesStep = createStep(
  "log-issue-assignees",
  async (
    input: {
      entity_id: string
      actor_id: string
      workspace_id: string
      assignee_ids: string[]
      oldAssignees: string[]
    },
    { container }
  ) => {
    const svc = container.resolve("activityModuleService") as any
    const action = input.assignee_ids.length > 0 ? "assigned" : "unassigned"
    await svc.recordActivity({
      entity_type: "issue",
      entity_id: input.entity_id,
      actor_id: input.actor_id,
      action,
      workspace_id: input.workspace_id,
      changes: { assignee_ids: { from: input.oldAssignees, to: input.assignee_ids } },
    })
  }
)

// ─── Workflow ─────────────────────────────────────────────────────────────────

export const assignIssueWorkflow = createWorkflow(
  "assign-issue",
  async (input: AssignIssueInput) => {
    const { issue, newAssignees, actor_id, oldAssignees } = await fetchIssueForAssignStep(input)
    const updated = await setAssigneesStep({ issue, newAssignees, actor_id })

    const activityInput = transform(updated, (u) => ({
      entity_id: u.id,
      actor_id: actor_id ?? "system",
      workspace_id: u.workspace_id,
      assignee_ids: newAssignees,
      oldAssignees,
    }))
    await logAssigneesStep(activityInput)

    await emitEventStep({
      name: "issue.assigned",
      data: {
        issue_id: updated.id,
        workspace_id: updated.workspace_id,
        actor_id: actor_id ?? "system",
        assignee_ids: newAssignees,
      },
    })

    return new WorkflowResponse(updated)
  }
)
