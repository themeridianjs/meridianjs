import { MeridianService } from "@meridianjs/framework-utils"
import type { MeridianContainer } from "@meridianjs/types"
import WorkspaceMemberModel from "./models/workspace-member.js"

export class WorkspaceMemberModuleService extends MeridianService({
  WorkspaceMember: WorkspaceMemberModel,
}) {
  private readonly container: MeridianContainer

  constructor(container: MeridianContainer) {
    super(container)
    this.container = container
  }

  async getWorkspaceIdsForUser(userId: string): Promise<string[]> {
    const repo = this.container.resolve<any>("workspaceMemberRepository")
    const members = await repo.find({ user_id: userId })
    return members.map((m: any) => m.workspace_id)
  }

  async getMembership(workspaceId: string, userId: string): Promise<any | null> {
    const repo = this.container.resolve<any>("workspaceMemberRepository")
    return repo.findOne({ workspace_id: workspaceId, user_id: userId }) ?? null
  }

  async isMember(workspaceId: string, userId: string): Promise<boolean> {
    return !!(await this.getMembership(workspaceId, userId))
  }

  async ensureMember(workspaceId: string, userId: string, role: "admin" | "member" = "member") {
    if (await this.isMember(workspaceId, userId)) return
    return this.createWorkspaceMember({ workspace_id: workspaceId, user_id: userId, role })
  }
}
