import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
  transform,
  when,
} from "@meridianjs/workflow-engine"
import { emitEventStep } from "./emit-event.js"

export interface CompleteSprintInput {
  sprintId: string
  moveIncompleteToSprintId?: string | null
  actor_id?: string | null
}

const fetchSprintStep = createStep(
  "fetch-sprint-for-completion",
  async (input: CompleteSprintInput, { container }) => {
    const svc = container.resolve("sprintModuleService") as any
    const sprint = await svc.retrieveSprint(input.sprintId)
    if (sprint.status !== "active") {
      throw Object.assign(
        new Error(`Sprint "${sprint.name}" is not active (status: ${sprint.status})`),
        { status: 400 }
      )
    }
    return sprint
  }
)

const markSprintCompletedStep = createStep(
  "mark-sprint-completed",
  async (sprint: any, { container }) => {
    const svc = container.resolve("sprintModuleService") as any
    const updated = await svc.completeSprint(sprint.id)
    return new StepResponse(updated, { sprintId: sprint.id, previousStatus: sprint.status })
  },
  async ({ sprintId, previousStatus }, { container }) => {
    const svc = container.resolve("sprintModuleService") as any
    await svc.updateSprint(sprintId, { status: previousStatus })
  }
)

const moveIncompleteIssuesStep = createStep(
  "move-incomplete-issues",
  async (input: { fromSprintId: string; toSprintId: string }, { container }) => {
    const issueSvc = container.resolve("issueModuleService") as any
    const [issues] = await issueSvc.listAndCountIssues(
      { sprint_id: input.fromSprintId },
      { limit: 500 }
    )
    const incomplete = issues.filter(
      (i: any) => i.status !== "done" && i.status !== "cancelled"
    )
    if (!incomplete.length) return { moved: 0 }
    await Promise.all(
      incomplete.map((i: any) => issueSvc.updateIssue(i.id, { sprint_id: input.toSprintId }))
    )
    return { moved: incomplete.length }
  }
)

const logSprintCompletedStep = createStep(
  "log-sprint-completed",
  async (input: { entity_id: string; actor_id: string; project_id: string }, { container }) => {
    const activitySvc = container.resolve("activityModuleService") as any
    // Resolve workspace_id from the project (sprint model has project_id, not workspace_id)
    let workspace_id: string = input.project_id
    try {
      const projectSvc = container.resolve("projectModuleService") as any
      const project = await projectSvc.retrieveProject(input.project_id)
      workspace_id = project?.workspace_id ?? input.project_id
    } catch { /* fall back to project_id if project lookup fails */ }
    await activitySvc.recordActivity({
      entity_type: "sprint", entity_id: input.entity_id,
      actor_id: input.actor_id, action: "completed", workspace_id,
    })
  }
)

export const completeSprintWorkflow = createWorkflow(
  "complete-sprint",
  async (input: CompleteSprintInput) => {
    const sprint = await fetchSprintStep(input)
    const completed = await markSprintCompletedStep(sprint)
    await when(!!input.moveIncompleteToSprintId, () =>
      moveIncompleteIssuesStep({ fromSprintId: sprint.id, toSprintId: input.moveIncompleteToSprintId! })
    )
    const activityInput = transform(completed, (s) => ({
      entity_id: s.id, actor_id: input.actor_id ?? "system", project_id: s.project_id,
    }))
    await logSprintCompletedStep(activityInput)
    await emitEventStep({
      name: "sprint.completed",
      data: { sprint_id: completed.id, project_id: completed.project_id, actor_id: input.actor_id ?? "system" },
    })
    return new WorkflowResponse(completed)
  }
)
