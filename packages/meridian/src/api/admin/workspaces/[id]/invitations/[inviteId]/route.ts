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

export const DELETE = async (req: any, res: Response) => {
  if (!await assertWorkspaceAccess(req, res)) return

  const svc = req.scope.resolve("invitationModuleService") as any

  const invitation = await svc.retrieveInvitation(req.params.inviteId).catch(() => null)
  if (!invitation) {
    res.status(404).json({ error: { message: "Invitation not found" } })
    return
  }

  // Ensure the invitation belongs to the workspace in the URL
  if (invitation.workspace_id !== req.params.id) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }

  // Caller must have member:invite permission or be admin/super-admin
  const roles: string[] = req.user?.roles ?? []
  const permissions: string[] = req.user?.permissions ?? []
  const isPrivileged = roles.includes("super-admin") || roles.includes("admin")
  if (!isPrivileged && !permissions.includes("member:invite")) {
    res.status(403).json({ error: { message: "Forbidden — requires member:invite permission" } })
    return
  }

  await svc.revokeInvitation(req.params.inviteId)
  res.status(204).send()
}
