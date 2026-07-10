import type { Response } from "express"
import { requireRoles } from "@meridianjs/auth"
import { ROLES } from "@meridianjs/types"

export const DELETE = async (req: any, res: Response) => {
  requireRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN)(req, res, async () => {
    const svc = req.scope.resolve("invitationModuleService") as any

    const invitation = await svc.retrieveInvitation(req.params.inviteId).catch(() => null)
    if (!invitation) {
      res.status(404).json({ error: { message: "Invitation not found" } })
      return
    }

    await svc.revokeInvitation(req.params.inviteId)
    res.status(204).send()
  })
}
