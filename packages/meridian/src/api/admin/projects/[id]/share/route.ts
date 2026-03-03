import type { Response } from "express"

/** Check if the caller is allowed to manage share settings for this project. */
async function canManageShare(req: any, project: { id: string; workspace_id: string }): Promise<boolean> {
  const roles: string[] = req.user?.roles ?? []
  if (roles.includes("super-admin") || roles.includes("admin")) return true

  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
  const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
  const userId = req.user?.id

  const membership = await workspaceMemberService.getMembership(project.workspace_id, userId).catch(() => null)
  if (membership?.role === "admin") return true

  const members = await projectMemberService.listProjectMembers(project.id)
  return members.some((m: any) => m.user_id === userId && m.role === "manager")
}

export const POST = async (req: any, res: Response) => {
  const projectService = req.scope.resolve("projectModuleService") as any
  const project = await projectService.retrieveProject(req.params.id).catch(() => null)
  if (!project) { res.status(404).json({ error: { message: "Project not found" } }); return }

  if (!await canManageShare(req, project)) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }

  const updated = await projectService.generateShareToken(req.params.id)
  const origin = `${req.protocol}://${req.get("host")}`
  const shareUrl = `${origin}/share/${updated.share_token}`

  const activityService = req.scope.resolve("activityModuleService") as any
  activityService.recordActivity({
    entity_type: "project", entity_id: req.params.id,
    actor_id: req.user?.id ?? "system", action: "share_enabled",
    workspace_id: project.workspace_id,
    changes: { share_url: { from: null, to: shareUrl } },
  }).catch(() => {})

  res.json({ share_url: shareUrl, project: updated })
}

export const DELETE = async (req: any, res: Response) => {
  const projectService = req.scope.resolve("projectModuleService") as any
  const project = await projectService.retrieveProject(req.params.id).catch(() => null)
  if (!project) { res.status(404).json({ error: { message: "Project not found" } }); return }

  if (!await canManageShare(req, project)) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }

  const updated = await projectService.revokeShareToken(req.params.id)

  const activityService = req.scope.resolve("activityModuleService") as any
  activityService.recordActivity({
    entity_type: "project", entity_id: req.params.id,
    actor_id: req.user?.id ?? "system", action: "share_revoked",
    workspace_id: project.workspace_id,
  }).catch(() => {})

  res.json({ project: updated })
}
