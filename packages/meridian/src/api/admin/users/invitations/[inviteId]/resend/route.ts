import type { Response } from "express"
import { requireRoles } from "@meridianjs/auth"
import { EVENTS, ROLES } from "@meridianjs/types"

export const POST = async (req: any, res: Response) => {
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN)(req, res, async () => {
    const svc = req.scope.resolve("invitationModuleService") as any
    const invitation = await svc.retrieveInvitation(req.params.inviteId).catch(() => null)

    if (!invitation) {
      res.status(404).json({ error: { message: "Invitation not found" } })
      return
    }

    if (invitation.status !== "pending") {
      res.status(400).json({ error: { message: "Only pending invitations can be resent" } })
      return
    }

    if (!invitation.email) {
      res.status(400).json({ error: { message: "Cannot resend a link-only invitation — share the link directly" } })
      return
    }

    const eventBus = req.scope.resolve("eventBus") as any
    await eventBus.emit({
      name: EVENTS.WORKSPACE_MEMBER_INVITED,
      data: {
        invitation_id: invitation.id,
        workspace_id: invitation.workspace_id ?? null,
        email: invitation.email,
        role: invitation.role,
        created_by: req.user?.id ?? "system",
      },
    }).catch(() => {})

    res.json({ success: true })
  })
}
