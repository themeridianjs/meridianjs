import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
  transform,
  when,
} from "@meridian/workflow-engine"
import { emitEventStep } from "./emit-event.js"

// ─── Input / Output types ────────────────────────────────────────────────────

export interface CompleteSprintInput {
  sprintId: string
  /** If provided, incomplete issues are moved to this sprint */
  moveIncompleteToSprintId?: string | null
  actor_id?: string | null
}

// ─── Steps ───────────────────────────────────────────────────────────────────

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
    return new StepResponse(updated, {
      sprintId: sprint.id,
      previousStatus: sprint.status,
    })
  },
  // Compensate: restore sprint to active
  async ({ sprintId, previousStatus }, { container }) => {
    const svc = container.resolve("sprintModuleService") as any
    await svc.updateSprint(sprintId, { status: previousStatus })
  }
)

const moveIncompleteIssuesStep = createStep(
  "move-incomplete-issues",
  async (
    input: { fromSprintId: string; toSprintId: string },
    { container }
  ) => {
    // TODO: In Phase 5, this will use module links to find sprint→issues.
    // For now, query issues directly by sprint_id via a custom service method.
    // This step is a no-op stub until link traversal (IQuery) is wired up.
    return { moved: 0 }
  }
)

const logSprintCompletedStep = createStep(
  "log-sprint-completed",
  async (
    input: { entity_id: string; actor_id: string; workspace_id: string },
    { container }
  ) => {
    const svc = container.resolve("activityModuleService") as any
    await svc.recordActivity({
      entity_type: "sprint",
      entity_id: input.entity_id,
      actor_id: input.actor_id,
      action: "completed",
      workspace_id: input.workspace_id,
    })
  }
)

// ─── Workflow ─────────────────────────────────────────────────────────────────

export const completeSprintWorkflow = createWorkflow(
  "complete-sprint",
  async (input: CompleteSprintInput) => {
    const sprint = await fetchSprintStep(input)
    const completed = await markSprintCompletedStep(sprint)

    // Optionally move incomplete issues to another sprint
    await when(!!input.moveIncompleteToSprintId, () =>
      moveIncompleteIssuesStep({
        fromSprintId: sprint.id,
        toSprintId: input.moveIncompleteToSprintId!,
      })
    )

    const activityInput = transform(completed, (s) => ({
      entity_id: s.id,
      actor_id: input.actor_id ?? "system",
      workspace_id: s.project_id, // sprint is scoped to a project; workspace_id TBD
    }))
    await logSprintCompletedStep(activityInput)

    await emitEventStep({
      name: "sprint.completed",
      data: {
        sprint_id: completed.id,
        project_id: completed.project_id,
        actor_id: input.actor_id ?? "system",
      },
    })

    return new WorkflowResponse(completed)
  }
)
