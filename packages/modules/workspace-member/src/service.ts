import { MeridianService } from "@meridianjs/framework-utils"
import type { MeridianContainer } from "@meridianjs/types"
import { ROLES } from "@meridianjs/types"
import WorkspaceMemberModel from "./models/workspace-member.js"
import WorkspaceAccessRequestModel from "./models/workspace-access-request.js"

export class WorkspaceMemberModuleService extends MeridianService({
  WorkspaceMember: WorkspaceMemberModel,
  WorkspaceAccessRequest: WorkspaceAccessRequestModel,
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

  async ensureMember(workspaceId: string, userId: string, role: "admin" | "member" = ROLES.MEMBER) {
    if (await this.isMember(workspaceId, userId)) return
    try {
      return await this.createWorkspaceMember({ workspace_id: workspaceId, user_id: userId, role })
    } catch (err: any) {
      // Unique constraint violation — another concurrent request created the membership
      if (err.code === "23505" || err.name === "UniqueConstraintViolationException") return
      throw err
    }
  }

  async createAccessRequest(data: { workspace_id: string; user_id: string; message?: string | null }): Promise<any> {
    const repo = this.container.resolve<any>("workspaceAccessRequestRepository")
    const record = repo.create({ ...data, status: "pending" })
    await repo.persistAndFlush(record)
    return record
  }

  async getPendingRequest(workspaceId: string, userId: string): Promise<any | null> {
    const repo = this.container.resolve<any>("workspaceAccessRequestRepository")
    return repo.findOne({ workspace_id: workspaceId, user_id: userId, status: "pending" }) ?? null
  }

  async getAccessRequest(id: string): Promise<any | null> {
    const repo = this.container.resolve<any>("workspaceAccessRequestRepository")
    return repo.findOne({ id }) ?? null
  }

  async listPendingAccessRequests(workspaceId: string): Promise<any[]> {
    const repo = this.container.resolve<any>("workspaceAccessRequestRepository")
    return repo.find({ workspace_id: workspaceId, status: "pending" }, { orderBy: { created_at: "ASC" } })
  }

  async updateAccessRequestStatus(id: string, status: "approved" | "denied"): Promise<any> {
    const repo = this.container.resolve<any>("workspaceAccessRequestRepository")
    const record = await repo.findOne({ id })
    if (!record) throw new Error("Access request not found")
    record.status = status
    await repo.persistAndFlush(record)
    return record
  }

  async getUserPendingRequests(userId: string): Promise<any[]> {
    const repo = this.container.resolve<any>("workspaceAccessRequestRepository")
    return repo.find({ user_id: userId, status: "pending" }, { orderBy: { created_at: "ASC" } })
  }

  async deleteAccessRequest(id: string): Promise<void> {
    const repo = this.container.resolve<any>("workspaceAccessRequestRepository")
    const record = await repo.findOne({ id })
    if (record) await repo.removeAndFlush(record)
  }
}
