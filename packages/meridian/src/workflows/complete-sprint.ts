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
  async (_input: { fromSprintId: string; toSprintId: string }, _ctx) => {
    return { moved: 0 }
  }
)

const logSprintCompletedStep = createStep(
  "log-sprint-completed",
  async (input: { entity_id: string; actor_id: string; workspace_id: string }, { container }) => {
    const svc = container.resolve("activityModuleService") as any
    await svc.recordActivity({
      entity_type: "sprint", entity_id: input.entity_id,
      actor_id: input.actor_id, action: "completed", workspace_id: input.workspace_id,
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
      entity_id: s.id, actor_id: input.actor_id ?? "system", workspace_id: s.project_id,
    }))
    await logSprintCompletedStep(activityInput)
    await emitEventStep({
      name: "sprint.completed",
      data: { sprint_id: completed.id, project_id: completed.project_id, actor_id: input.actor_id ?? "system" },
    })
    return new WorkflowResponse(completed)
  }
)
