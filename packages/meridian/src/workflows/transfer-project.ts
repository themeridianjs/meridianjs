import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@meridianjs/workflow-engine"
import { emitEventStep } from "./emit-event.js"

export interface TransferProjectInput {
  project_id: string
  target_workspace_id: string
  carry_over_user_ids: string[]
  actor_id?: string | null
}

const validateTransferStep = createStep(
  "validate-transfer",
  async (input: TransferProjectInput, { container }) => {
    const projectSvc = container.resolve("projectModuleService") as any
    const workspaceMemberSvc = container.resolve("workspaceMemberModuleService") as any

    const project = await projectSvc.retrieveProject(input.project_id).catch(() => null)
    if (!project) {
      throw Object.assign(new Error("Project not found"), { status: 404 })
    }
    if (project.workspace_id === input.target_workspace_id) {
      throw Object.assign(new Error("Project is already in the target workspace"), { status: 400 })
    }
    if (input.actor_id) {
      const membership = await workspaceMemberSvc.getMembership(input.target_workspace_id, input.actor_id)
      if (!membership) {
        throw Object.assign(new Error("You are not a member of the target workspace"), { status: 403 })
      }
    }

    return { project, ...input }
  }
)

const transferProjectStep = createStep(
  "transfer-project",
  async (
    input: { project: any; target_workspace_id: string; carry_over_user_ids: string[]; actor_id?: string | null },
    { container }
  ) => {
    const svc = container.resolve("projectModuleService") as any
    const original_workspace_id = input.project.workspace_id
    const updated = await svc.updateProject(input.project.id, { workspace_id: input.target_workspace_id })
    return new StepResponse(
      { project: updated, carry_over_user_ids: input.carry_over_user_ids, actor_id: input.actor_id, original_workspace_id },
      { project_id: input.project.id, original_workspace_id }
    )
  },
  async ({ project_id, original_workspace_id }: { project_id: string; original_workspace_id: string }, { container }) => {
    const svc = container.resolve("projectModuleService") as any
    await svc.updateProject(project_id, { workspace_id: original_workspace_id })
  }
)

const updateIssuesWorkspaceStep = createStep(
  "update-issues-workspace",
  async (
    input: { project: any; carry_over_user_ids: string[]; actor_id?: string | null; original_workspace_id: string },
    { container }
  ) => {
    const issueSvc = container.resolve("issueModuleService") as any
    const [issues] = await issueSvc.listAndCountIssues(
      { project_id: input.project.id },
      { limit: 10000, offset: 0 }
    )
    const issueIds: string[] = []
    for (const issue of issues) {
      await issueSvc.updateIssue(issue.id, { workspace_id: input.project.workspace_id })
      issueIds.push(issue.id)
    }
    return new StepResponse(
      { project: input.project, carry_over_user_ids: input.carry_over_user_ids, actor_id: input.actor_id, original_workspace_id: input.original_workspace_id },
      { issueIds, original_workspace_id: input.original_workspace_id }
    )
  },
  async (
    { issueIds, original_workspace_id }: { issueIds: string[]; original_workspace_id: string },
    { container }
  ) => {
    const issueSvc = container.resolve("issueModuleService") as any
    for (const id of issueIds) {
      await issueSvc.updateIssue(id, { workspace_id: original_workspace_id })
    }
  }
)

const adjustMembershipsStep = createStep(
  "adjust-memberships",
  async (
    input: { project: any; carry_over_user_ids: string[]; actor_id?: string | null; original_workspace_id: string },
    { container }
  ) => {
    const projectMemberSvc = container.resolve("projectMemberModuleService") as any
    const workspaceMemberSvc = container.resolve("workspaceMemberModuleService") as any
    const projectId = input.project.id
    const targetWorkspaceId = input.project.workspace_id

    // Remove all project teams (workspace-scoped, can't transfer)
    const projectTeams = await projectMemberSvc.listProjectTeamIds(projectId)
    for (const { team_id } of projectTeams) {
      await projectMemberSvc.removeProjectTeam(projectId, team_id)
    }

    // Handle project members
    const members = await projectMemberSvc.listProjectMembers(projectId)
    const carryOverSet = new Set(input.carry_over_user_ids)
    for (const member of members) {
      if (carryOverSet.has(member.user_id)) {
        // Ensure carried-over members exist in target workspace
        await workspaceMemberSvc.ensureMember(targetWorkspaceId, member.user_id, "member")
      } else {
        // Remove members not carried over from project
        await projectMemberSvc.removeProjectMember(projectId, member.user_id)
      }
    }
  }
)

const logTransferActivityStep = createStep(
  "log-transfer-activity",
  async (
    input: { project: any; actor_id?: string | null; original_workspace_id: string },
    { container }
  ) => {
    const activitySvc = container.resolve("activityModuleService") as any
    const workspaceSvc = container.resolve("workspaceModuleService") as any

    // Resolve workspace names for a human-readable log entry
    const [fromWs, toWs] = await Promise.all([
      workspaceSvc.retrieveWorkspace(input.original_workspace_id).catch(() => null),
      workspaceSvc.retrieveWorkspace(input.project.workspace_id).catch(() => null),
    ])

    await activitySvc.recordActivity({
      entity_type: "project",
      entity_id: input.project.id,
      actor_id: input.actor_id ?? "system",
      action: "transferred",
      workspace_id: input.project.workspace_id,
      changes: {
        workspace_id: {
          from: input.original_workspace_id,
          to: input.project.workspace_id,
        },
        from_workspace_name: {
          from: fromWs?.name ?? input.original_workspace_id,
          to: null,
        },
        to_workspace_name: {
          from: null,
          to: toWs?.name ?? input.project.workspace_id,
        },
      },
    }).catch(() => {})
  }
)

export const transferProjectWorkflow = createWorkflow(
  "transfer-project",
  async (input: TransferProjectInput) => {
    const validated = await validateTransferStep(input)
    const transferred = await transferProjectStep(validated)
    const withIssues = await updateIssuesWorkspaceStep(transferred)
    await adjustMembershipsStep(withIssues)
    await logTransferActivityStep({ project: transferred.project, actor_id: input.actor_id, original_workspace_id: transferred.original_workspace_id })
    await emitEventStep({
      name: "project.transferred",
      data: { project_id: transferred.project.id, workspace_id: transferred.project.workspace_id, actor_id: input.actor_id ?? "system" },
    })
    return new WorkflowResponse(transferred.project)
  }
)
