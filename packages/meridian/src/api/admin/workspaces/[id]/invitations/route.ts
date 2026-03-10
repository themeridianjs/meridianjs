import type { Response } from "express"
import { createInvitationWorkflow } from "../../../../../workflows/create-invitation.js"

async function assertWorkspaceMembership(req: any, res: Response): Promise<boolean> {
  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any

  const workspace = await workspaceService.retrieveWorkspace(req.params.id)
  const roles: string[] = req.user?.roles ?? []
  const isPrivileged = roles.includes("super-admin") || roles.includes("admin")

  // Private workspaces: always require membership regardless of role
  if (workspace?.is_private || !isPrivileged) {
    const membership = await workspaceMemberService.getMembership(req.params.id, req.user?.id)
    if (!membership) {
      res.status(403).json({ error: { message: "Forbidden — not a member of this workspace" } })
      return false
    }
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

  if (!role || !["super-admin", "admin", "member"].includes(role)) {
    res.status(400).json({ error: { message: "role must be 'super-admin', 'admin', or 'member'" } })
    return
  }

  // Privilege check: only admins/super-admins can invite admins or super-admins
  if (role !== "member") {
    const callerRoles: string[] = req.user?.roles ?? []
    if (!callerRoles.includes("super-admin") && !callerRoles.includes("admin")) {
      res.status(403).json({ error: { message: "Only admins can invite users with elevated roles" } })
      return
    }
  }

  if (email?.trim()) {
    const normalizedEmail = email.trim().toLowerCase()
    const userService = req.scope.resolve("userModuleService") as any
    const invitationService = req.scope.resolve("invitationModuleService") as any

    const [existing] = await userService.listAndCountUsers({ email: normalizedEmail }, { limit: 1 })
    if (existing.length > 0) {
      res.status(409).json({ error: { message: `A user with email ${normalizedEmail} already exists. They can be added directly as a workspace member.` } })
      return
    }

    // Check for any pending invitation for this email (any scope)
    const [pendingInvites] = await invitationService.listAndCountInvitations(
      { email: normalizedEmail, status: "pending" },
      { limit: 1 }
    )
    if (pendingInvites.length > 0) {
      res.status(409).json({ error: { message: `A pending invitation for ${normalizedEmail} already exists.` } })
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
