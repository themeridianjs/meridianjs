import { MeridianService } from "@meridianjs/framework-utils"
import type { MeridianContainer } from "@meridianjs/types"
import TeamMemberModel from "./models/team-member.js"

export class TeamMemberModuleService extends MeridianService({ TeamMember: TeamMemberModel }) {
  private readonly container: MeridianContainer

  constructor(container: MeridianContainer) {
    super(container)
    this.container = container
  }

  async getTeamMemberUserIds(teamId: string): Promise<string[]> {
    const repo = this.container.resolve<any>("teamMemberRepository")
    const members = await repo.find({ team_id: teamId })
    return members.map((m: any) => m.user_id)
  }

  async getUserTeamIds(userId: string): Promise<string[]> {
    const repo = this.container.resolve<any>("teamMemberRepository")
    const members = await repo.find({ user_id: userId })
    return members.map((m: any) => m.team_id)
  }

  async isMember(teamId: string, userId: string): Promise<boolean> {
    const repo = this.container.resolve<any>("teamMemberRepository")
    return !!(await repo.findOne({ team_id: teamId, user_id: userId }))
  }

  async ensureMember(teamId: string, userId: string) {
    if (await this.isMember(teamId, userId)) return
    return this.createTeamMember({ team_id: teamId, user_id: userId })
  }

  async removeByTeamAndUser(teamId: string, userId: string) {
    const repo = this.container.resolve<any>("teamMemberRepository")
    const m = await repo.findOne({ team_id: teamId, user_id: userId })
    if (m) await this.deleteTeamMember(m.id)
  }

  async deleteAllForTeam(teamId: string) {
    const repo = this.container.resolve<any>("teamMemberRepository")
    const members = await repo.find({ team_id: teamId })
    for (const m of members) await this.deleteTeamMember(m.id)
  }
}
