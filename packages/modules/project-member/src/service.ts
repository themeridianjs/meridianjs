import { MeridianService } from "@meridianjs/framework-utils"
import type { MeridianContainer } from "@meridianjs/types"
import { PROJECT_ROLES } from "@meridianjs/types"
import ProjectMemberModel from "./models/project-member.js"
import ProjectTeamModel from "./models/project-team.js"
import ProjectAccessRequestModel from "./models/project-access-request.js"

export class ProjectMemberModuleService extends MeridianService({
  ProjectMember: ProjectMemberModel,
  ProjectTeam: ProjectTeamModel,
  ProjectAccessRequest: ProjectAccessRequestModel,
}) {
  private readonly container: MeridianContainer

  constructor(container: MeridianContainer) {
    super(container)
    this.container = container
  }

  async getAccessibleProjectIds(userId: string, userTeamIds: string[]): Promise<string[]> {
    const memberRepo = this.container.resolve<any>("projectMemberRepository")
    const teamRepo = this.container.resolve<any>("projectTeamRepository")

    const direct = await memberRepo.find({ user_id: userId })
    const directIds = direct.map((m: any) => m.project_id)

    let teamProjectIds: string[] = []
    if (userTeamIds.length > 0) {
      const teamAccess = await teamRepo.find({ team_id: userTeamIds })
      teamProjectIds = teamAccess.map((t: any) => t.project_id)
    }

    return [...new Set([...directIds, ...teamProjectIds])]
  }

  async listProjectMembers(projectId: string): Promise<Array<{ id: string; user_id: string; role: string }>> {
    const repo = this.container.resolve<any>("projectMemberRepository")
    const members = await repo.find({ project_id: projectId })
    return members.map((m: any) => ({ id: m.id, user_id: m.user_id, role: m.role }))
  }

  /** Batch: list project members for multiple projects in a single query. */
  async listProjectMembersForProjects(projectIds: string[]): Promise<Array<{ id: string; user_id: string; project_id: string; role: string }>> {
    if (projectIds.length === 0) return []
    const repo = this.container.resolve<any>("projectMemberRepository")
    const members = await repo.find({ project_id: { $in: projectIds } })
    return members.map((m: any) => ({ id: m.id, user_id: m.user_id, project_id: m.project_id, role: m.role }))
  }

  async listProjectTeamIds(projectId: string): Promise<Array<{ id: string; team_id: string }>> {
    const repo = this.container.resolve<any>("projectTeamRepository")
    const teams = await repo.find({ project_id: projectId })
    return teams.map((t: any) => ({ id: t.id, team_id: t.team_id }))
  }

  /** Batch: list project team associations for multiple projects in a single query. */
  async listProjectTeamIdsForProjects(projectIds: string[]): Promise<Array<{ id: string; team_id: string; project_id: string }>> {
    if (projectIds.length === 0) return []
    const repo = this.container.resolve<any>("projectTeamRepository")
    const teams = await repo.find({ project_id: { $in: projectIds } })
    return teams.map((t: any) => ({ id: t.id, team_id: t.team_id, project_id: t.project_id }))
  }

  async ensureProjectMember(projectId: string, userId: string, role: "manager" | "member" | "viewer" = PROJECT_ROLES.MEMBER) {
    const repo = this.container.resolve<any>("projectMemberRepository")
    if (await repo.findOne({ project_id: projectId, user_id: userId })) return
    try {
      return await this.createProjectMember({ project_id: projectId, user_id: userId, role })
    } catch (err: any) {
      if (err.code === "23505" || err.name === "UniqueConstraintViolationException") return
      throw err
    }
  }

  async ensureProjectTeam(projectId: string, teamId: string) {
    const repo = this.container.resolve<any>("projectTeamRepository")
    if (await repo.findOne({ project_id: projectId, team_id: teamId })) return
    try {
      return await this.createProjectTeam({ project_id: projectId, team_id: teamId })
    } catch (err: any) {
      if (err.code === "23505" || err.name === "UniqueConstraintViolationException") return
      throw err
    }
  }

  async removeProjectMember(projectId: string, userId: string) {
    const repo = this.container.resolve<any>("projectMemberRepository")
    const m = await repo.findOne({ project_id: projectId, user_id: userId })
    if (m) await this.deleteProjectMember(m.id)
  }

  async removeProjectTeam(projectId: string, teamId: string) {
    const repo = this.container.resolve<any>("projectTeamRepository")
    const m = await repo.findOne({ project_id: projectId, team_id: teamId })
    if (m) await this.deleteProjectTeam(m.id)
  }

  // ── Access Requests ──────────────────────────────────────────────────────────

  async createAccessRequest(data: { project_id: string; user_id: string; message?: string | null }) {
    return this.createProjectAccessRequest({ project_id: data.project_id, user_id: data.user_id, message: data.message ?? null, status: "pending" })
  }

  async getPendingRequest(projectId: string, userId: string) {
    const repo = this.container.resolve<any>("projectAccessRequestRepository")
    return repo.findOne({ project_id: projectId, user_id: userId, status: "pending" })
  }

  async getAccessRequest(id: string) {
    const repo = this.container.resolve<any>("projectAccessRequestRepository")
    return repo.findOne({ id })
  }

  async listPendingAccessRequests(projectId: string) {
    const repo = this.container.resolve<any>("projectAccessRequestRepository")
    return repo.find({ project_id: projectId, status: "pending" })
  }

  async updateAccessRequestStatus(id: string, status: "approved" | "denied") {
    return this.updateProjectAccessRequest(id, { status })
  }

  async getPendingCountsForProjects(projectIds: string[]): Promise<Map<string, number>> {
    if (projectIds.length === 0) return new Map()
    const repo = this.container.resolve<any>("projectAccessRequestRepository")
    const requests = await repo.find({ project_id: { $in: projectIds }, status: "pending" })
    const counts = new Map<string, number>()
    for (const r of requests) {
      counts.set(r.project_id, (counts.get(r.project_id) ?? 0) + 1)
    }
    return counts
  }

  async getUserPendingProjectIds(userId: string, projectIds: string[]): Promise<Set<string>> {
    if (projectIds.length === 0) return new Set()
    const repo = this.container.resolve<any>("projectAccessRequestRepository")
    const requests = await repo.find({ user_id: userId, status: "pending", project_id: { $in: projectIds } })
    return new Set(requests.map((r: any) => r.project_id))
  }

  async deleteAccessRequest(id: string): Promise<void> {
    const repo = this.container.resolve<any>("projectAccessRequestRepository")
    const record = await repo.findOne({ id })
    if (record) await repo.removeAndFlush(record)
  }
}
