import type { Response } from "express"

async function assertWorkspaceAccess(req: any, res: Response): Promise<boolean> {
  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any

  const workspace = await workspaceService.retrieveWorkspace(req.params.id)
  const roles: string[] = req.user?.roles ?? []
  const isPrivileged = roles.includes("super-admin") || roles.includes("admin")

  if (workspace?.is_private || !isPrivileged) {
    const membership = await workspaceMemberService.getMembership(req.params.id, req.user?.id)
    if (!membership) {
      res.status(403).json({ error: { message: "Forbidden — not a member of this workspace" } })
      return false
    }
  }
  return true
}

export const POST = async (req: any, res: Response) => {
  if (!await assertWorkspaceAccess(req, res)) return

  const roles: string[] = req.user?.roles ?? []
  const permissions: string[] = req.user?.permissions ?? []
  const isPrivileged = roles.includes("super-admin") || roles.includes("admin")
  if (!isPrivileged && !permissions.includes("member:invite")) {
    res.status(403).json({ error: { message: "Forbidden — requires member:invite permission" } })
    return
  }

  const svc = req.scope.resolve("invitationModuleService") as any
  const invitation = await svc.retrieveInvitation(req.params.inviteId).catch(() => null)

  if (!invitation) {
    res.status(404).json({ error: { message: "Invitation not found" } })
    return
  }

  if (invitation.workspace_id !== req.params.id) {
    res.status(403).json({ error: { message: "Forbidden" } })
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
    name: "workspace.member_invited",
    data: {
      invitation_id: invitation.id,
      workspace_id: invitation.workspace_id,
      email: invitation.email,
      role: invitation.role,
      created_by: req.user?.id ?? "system",
    },
  }).catch(() => {})

  res.json({ success: true })
}
