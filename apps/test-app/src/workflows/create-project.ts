import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
  transform,
} from "@meridian/workflow-engine"
import { emitEventStep } from "./emit-event.js"

// ─── Input / Output types ────────────────────────────────────────────────────

export interface CreateProjectInput {
  name: string
  workspace_id: string
  identifier?: string
  description?: string | null
  visibility?: "private" | "public" | "workspace"
  icon?: string | null
  color?: string | null
  owner_id?: string | null
}

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

// ─── Workflow ─────────────────────────────────────────────────────────────────

export const createProjectWorkflow = createWorkflow(
  "create-project",
  async (input: CreateProjectInput & { actor_id?: string | null }) => {
    const enriched = await validateIdentifierStep(input)
    const project = await createProjectStep(enriched)

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
