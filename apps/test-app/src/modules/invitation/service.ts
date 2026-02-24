import { MeridianService } from "@meridianjs/framework-utils"
import type { MeridianContainer } from "@meridianjs/types"
import { randomUUID } from "node:crypto"
import InvitationModel from "./models/invitation.js"

export class InvitationModuleService extends MeridianService({ Invitation: InvitationModel }) {
  private readonly container: MeridianContainer

  constructor(container: MeridianContainer) {
    super(container)
    this.container = container
  }

  async createInvitationWithToken(data: {
    workspace_id: string
    email?: string | null
    role: "admin" | "member"
    created_by: string
  }) {
    return this.createInvitation({
      workspace_id: data.workspace_id,
      email: data.email ?? null,
      role: data.role,
      token: randomUUID(),
      status: "pending" as const,
      created_by: data.created_by,
    })
  }

  async revokeInvitation(id: string) {
    return this.updateInvitation(id, { status: "revoked" as const })
  }
}
