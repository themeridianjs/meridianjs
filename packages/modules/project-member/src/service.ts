import { MeridianService } from "@meridianjs/framework-utils"
import type { MeridianContainer } from "@meridianjs/types"
import ProjectMemberModel from "./models/project-member.js"
import ProjectTeamModel from "./models/project-team.js"

export class ProjectMemberModuleService extends MeridianService({
  ProjectMember: ProjectMemberModel,
  ProjectTeam: ProjectTeamModel,
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

  async listProjectTeamIds(projectId: string): Promise<Array<{ id: string; team_id: string }>> {
    const repo = this.container.resolve<any>("projectTeamRepository")
    const teams = await repo.find({ project_id: projectId })
    return teams.map((t: any) => ({ id: t.id, team_id: t.team_id }))
  }

  async ensureProjectMember(projectId: string, userId: string, role: "manager" | "member" | "viewer" = "member") {
    const repo = this.container.resolve<any>("projectMemberRepository")
    if (await repo.findOne({ project_id: projectId, user_id: userId })) return
    return this.createProjectMember({ project_id: projectId, user_id: userId, role })
  }

  async ensureProjectTeam(projectId: string, teamId: string) {
    const repo = this.container.resolve<any>("projectTeamRepository")
    if (await repo.findOne({ project_id: projectId, team_id: teamId })) return
    return this.createProjectTeam({ project_id: projectId, team_id: teamId })
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
}
