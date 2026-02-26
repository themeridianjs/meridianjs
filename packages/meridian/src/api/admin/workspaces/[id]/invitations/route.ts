import type { Response } from "express"
import { createInvitationWorkflow } from "../../../../../workflows/create-invitation.js"

export const GET = async (req: any, res: Response) => {
  const svc = req.scope.resolve("invitationModuleService") as any
  const [invitations, count] = await svc.listAndCountInvitations(
    { workspace_id: req.params.id },
    { limit: 100 }
  )
  res.json({ invitations, count })
}

export const POST = async (req: any, res: Response) => {
  const { email, role, app_role_id } = req.body

  if (!role || !["admin", "member"].includes(role)) {
    res.status(400).json({ error: { message: "role must be 'admin' or 'member'" } })
    return
  }

  if (email?.trim()) {
    const userService = req.scope.resolve("userModuleService") as any
    const [existing] = await userService.listAndCountUsers({ email: email.trim().toLowerCase() }, { limit: 1 })
    if (existing.length > 0) {
      res.status(409).json({ error: { message: `A user with email ${email.trim()} already exists. They can be added directly as a workspace member.` } })
      return
    }
  }

  const { result, errors, transaction_status } = await createInvitationWorkflow(req.scope).run({
    input: {
      workspace_id: req.params.id,
      email: email?.trim() || null,
      role,
      app_role_id: app_role_id ?? null,
      created_by: req.user?.id ?? "system",
    },
  })

  if (transaction_status === "reverted") {
    res.status(500).json({ error: { message: errors[0]?.message ?? "Failed to create invitation" } })
    return
  }

  res.status(201).json({ invitation: result })
}
