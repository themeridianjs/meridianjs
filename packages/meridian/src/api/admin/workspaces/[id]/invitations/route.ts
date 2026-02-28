import type { Response } from "express"
import { createInvitationWorkflow } from "../../../../../workflows/create-invitation.js"

async function assertWorkspaceMembership(req: any, res: Response): Promise<boolean> {
  const roles: string[] = req.user?.roles ?? []
  if (roles.includes("super-admin") || roles.includes("admin")) return true
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
  const membership = await workspaceMemberService.getMembership(req.params.id, req.user?.id)
  if (!membership) {
    res.status(403).json({ error: { message: "Forbidden — not a member of this workspace" } })
    return false
  }
  return true
}

export const GET = async (req: any, res: Response) => {
  if (!await assertWorkspaceMembership(req, res)) return
  const svc = req.scope.resolve("invitationModuleService") as any
  const [invitations, count] = await svc.listAndCountInvitations(
    { workspace_id: req.params.id },
    { limit: 100 }
  )
  res.json({ invitations, count })
}

export const POST = async (req: any, res: Response) => {
  if (!await assertWorkspaceMembership(req, res)) return
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
