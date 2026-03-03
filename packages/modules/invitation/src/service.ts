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
    role: "super-admin" | "admin" | "member"
    app_role_id?: string | null
    created_by: string
    expires_in_days?: number
  }) {
    const expiresInDays = data.expires_in_days ?? 7
    return this.createInvitation({
      workspace_id: data.workspace_id,
      email: data.email ?? null,
      role: data.role,
      app_role_id: data.app_role_id ?? null,
      token: randomUUID(),
      status: "pending" as const,
      expires_at: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
      created_by: data.created_by,
    })
  }

  async revokeInvitation(id: string) {
    return this.updateInvitation(id, { status: "revoked" as const })
  }
}
