import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
  transform,
} from "@meridianjs/workflow-engine"
import { emitEventStep } from "./emit-event.js"

// ─── Input / Output types ────────────────────────────────────────────────────

export interface InitialStatus {
  name: string
  key: string
  color: string
  category: "backlog" | "unstarted" | "started" | "completed" | "cancelled"
  position: number
}

export interface CreateProjectInput {
  name: string
  workspace_id: string
  identifier?: string
  description?: string | null
  visibility?: "private" | "public" | "workspace"
  icon?: string | null
  color?: string | null
  owner_id?: string | null
  initial_statuses?: InitialStatus[]
}

const DEFAULT_STATUSES: InitialStatus[] = [
  { name: "Backlog",     key: "backlog",      color: "#94a3b8", category: "backlog",    position: 0 },
  { name: "Todo",        key: "todo",         color: "#64748b", category: "unstarted",  position: 1 },
  { name: "In Progress", key: "in_progress",  color: "#6366f1", category: "started",    position: 2 },
  { name: "In Review",   key: "in_review",    color: "#f59e0b", category: "started",    position: 3 },
  { name: "Done",        key: "done",         color: "#10b981", category: "completed",  position: 4 },
  { name: "Cancelled",   key: "cancelled",    color: "#9ca3af", category: "cancelled",  position: 5 },
]

// ─── Steps ───────────────────────────────────────────────────────────────────

const validateIdentifierStep = createStep(
  "validate-project-identifier",
  async (input: CreateProjectInput, { container }) => {
    const svc = container.resolve("projectModuleService") as any

    const identifier = (
      input.identifier ?? svc.generateIdentifier(input.name)
    ).toUpperCase()

    const existing = await svc.retrieveProjectByIdentifier(identifier)
    if (existing) {
      throw Object.assign(new Error(`Identifier "${identifier}" is already taken`), {
        status: 409,
      })
    }

    return { ...input, identifier }
  }
)

const createProjectStep = createStep(
  "create-project",
  async (
    input: CreateProjectInput & { identifier: string },
    { container }
  ) => {
    const svc = container.resolve("projectModuleService") as any
    const project = await svc.createProject({
      name: input.name,
      identifier: input.identifier,
      description: input.description ?? null,
      workspace_id: input.workspace_id,
      visibility: input.visibility ?? "private",
      status: "active",
      icon: input.icon ?? null,
      color: input.color ?? null,
      owner_id: input.owner_id ?? null,
    })
    return new StepResponse(project, { projectId: project.id })
  },
  async ({ projectId }, { container }) => {
    const svc = container.resolve("projectModuleService") as any
    await svc.deleteProject(projectId)
  }
)

const logProjectCreatedStep = createStep(
  "log-project-created",
  async (
    input: { entity_id: string; actor_id: string; workspace_id: string },
    { container }
  ) => {
    const svc = container.resolve("activityModuleService") as any
    await svc.recordActivity({
      entity_type: "project",
      entity_id: input.entity_id,
      actor_id: input.actor_id,
      action: "created",
      workspace_id: input.workspace_id,
    })
  }
)

const seedDefaultStatusesStep = createStep(
  "seed-project-statuses",
  async (
    input: { project_id: string; initial_statuses?: InitialStatus[] },
    { container }
  ) => {
    const svc = container.resolve("projectModuleService") as any
    const statuses = input.initial_statuses ?? DEFAULT_STATUSES
    const created: string[] = []
    for (const s of statuses) {
      const status = await svc.createProjectStatus({
        project_id: input.project_id,
        name: s.name,
        key: s.key,
        color: s.color,
        category: s.category,
        position: s.position,
      })
      created.push(status.id)
    }
    return new StepResponse(created, { statusIds: created })
  },
  async ({ statusIds }: { statusIds: string[] }, { container }) => {
    const svc = container.resolve("projectModuleService") as any
    for (const id of statusIds) {
      await svc.deleteProjectStatus(id)
    }
  }
)

// ─── Workflow ─────────────────────────────────────────────────────────────────

export const createProjectWorkflow = createWorkflow(
  "create-project",
  async (input: CreateProjectInput & { actor_id?: string | null }) => {
    const enriched = await validateIdentifierStep(input)
    const project = await createProjectStep(enriched)

    const seedInput = transform(project, (p) => ({
      project_id: p.id,
      initial_statuses: input.initial_statuses,
    }))
    await seedDefaultStatusesStep(seedInput)

    const activityInput = transform(project, (p) => ({
      entity_id: p.id,
      actor_id: input.actor_id ?? "system",
      workspace_id: p.workspace_id,
    }))
    await logProjectCreatedStep(activityInput)

    await emitEventStep({
      name: "project.created",
      data: {
        project_id: project.id,
        workspace_id: project.workspace_id,
        actor_id: input.actor_id ?? "system",
      },
    })

    return new WorkflowResponse(project)
  }
)
