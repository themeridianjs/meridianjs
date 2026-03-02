import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
  transform,
} from "@meridianjs/workflow-engine"
import { emitEventStep } from "./emit-event.js"

export interface CreateIssueInput {
  title: string
  project_id: string
  workspace_id: string
  description?: string | null
  type?: string
  priority?: string
  status?: string
  assignee_ids?: string[] | null
  reporter_id?: string | null
  parent_id?: string | null
  start_date?: Date | null
  due_date?: Date
  estimate?: number | null
  sprint_id?: string | null
  task_list_id?: string | null
  actor_id?: string | null
  metadata?: Record<string, unknown> | null
  recurrence_frequency?: "weekly" | "monthly" | null
  recurrence_end_date?: Date | null
}

function computeFirstOccurrence(input: CreateIssueInput): Date | null {
  if (!input.recurrence_frequency) return null
  const base = input.start_date ? new Date(input.start_date) : new Date()
  const d = new Date(base)
  if (input.recurrence_frequency === "weekly") {
    d.setDate(d.getDate() + 7)
  } else {
    d.setMonth(d.getMonth() + 1)
  }
  return d
}

const createIssueStep = createStep(
  "create-issue",
  async (input: CreateIssueInput, { container }) => {
    const svc = container.resolve("issueModuleService") as any
    const issue = await svc.createIssueInProject({
      title: input.title, project_id: input.project_id, workspace_id: input.workspace_id,
      description: input.description, type: input.type, priority: input.priority,
      status: input.status, assignee_ids: input.assignee_ids ?? null,
      reporter_id: input.reporter_id ?? null, parent_id: input.parent_id ?? null,
      start_date: input.start_date ?? null, due_date: input.due_date, estimate: input.estimate ?? null,
      sprint_id: input.sprint_id ?? null, task_list_id: input.task_list_id ?? null,
      metadata: input.metadata ?? null,
      recurrence_frequency: input.recurrence_frequency ?? null,
      recurrence_end_date: input.recurrence_end_date ?? null,
      next_occurrence_date: computeFirstOccurrence(input),
    })
    return new StepResponse(issue, { issueId: issue.id })
  },
  async ({ issueId }, { container }) => {
    const svc = container.resolve("issueModuleService") as any
    await svc.deleteIssue(issueId)
  }
)

const logIssueCreatedStep = createStep(
  "log-issue-created",
  async (input: { entity_id: string; actor_id: string; workspace_id: string }, { container }) => {
    const svc = container.resolve("activityModuleService") as any
    await svc.recordActivity({
      entity_type: "issue", entity_id: input.entity_id,
      actor_id: input.actor_id, action: "created", workspace_id: input.workspace_id,
    })
  }
)

export const createIssueWorkflow = createWorkflow(
  "create-issue",
  async (input: CreateIssueInput) => {
    const issue = await createIssueStep(input)
    const activityInput = transform(issue, (i) => ({
      entity_id: i.id, actor_id: input.actor_id ?? "system", workspace_id: i.workspace_id,
    }))
    await logIssueCreatedStep(activityInput)
    await emitEventStep({
      name: "issue.created",
      data: {
        issue_id: issue.id, project_id: issue.project_id, workspace_id: issue.workspace_id,
        actor_id: input.actor_id ?? "system",
        assignee_ids: issue.assignee_ids ?? null, reporter_id: issue.reporter_id ?? null,
      },
    })
    return new WorkflowResponse(issue)
  }
)
