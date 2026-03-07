import type { Response, NextFunction } from "express"
import { requireRoles } from "@meridianjs/auth"

export const POST = async (req: any, res: Response, next: NextFunction) => {
  requireRoles("super-admin")(req, res, async () => {
    try {
      const invitationService = req.scope.resolve("invitationModuleService") as any
      const { email, role = "member" } = req.body

      if (!email || typeof email !== "string") {
        res.status(400).json({ error: { message: "email is required" } })
        return
      }

      if (!["super-admin", "admin", "member"].includes(role)) {
        res.status(400).json({ error: { message: "role must be 'super-admin', 'admin', or 'member'" } })
        return
      }

      const normalizedEmail = email.trim().toLowerCase()

      // Check if an active user with this email already exists
      const userService = req.scope.resolve("userModuleService") as any
      const [existing] = await userService.listAndCountUsers({ email: normalizedEmail }, { limit: 1 })
      if (existing.length > 0) {
        res.status(409).json({ error: { message: `A user with email ${normalizedEmail} already exists.` } })
        return
      }

      // Check if a pending invitation for this email already exists (any scope)
      const [pendingInvites] = await invitationService.listAndCountInvitations(
        { email: normalizedEmail, status: "pending" },
        { limit: 1 }
      )
      if (pendingInvites.length > 0) {
        res.status(409).json({ error: { message: `A pending invitation for ${normalizedEmail} already exists.` } })
        return
      }

      const invitation = await invitationService.createInvitationWithToken({
        workspace_id: null,
        email: normalizedEmail,
        role,
        created_by: req.user?.id ?? "system",
      })

      const eventBus = req.scope.resolve("eventBus") as any
      eventBus.emit({
        name: "workspace.member_invited",
        data: {
          invitation_id: invitation.id,
          workspace_id: null,
          email: normalizedEmail,
          role,
          created_by: req.user?.id ?? "system",
        },
      }).catch(() => {})

      res.status(201).json({ invitation })
    } catch (err) {
      next(err)
    }
  })
}
