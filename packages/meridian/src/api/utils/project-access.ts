/**
 * Shared project access check.
 *
 * Usage:
 *   const allowed = await hasProjectAccess(req, project)
 *   if (!allowed) { res.status(403).json({ error: { message: "Forbidden" } }); return }
 */
export async function hasProjectAccess(req: any, project: { id: string; workspace_id: string }): Promise<boolean> {
  const roles: string[] = req.user?.roles ?? []
  if (roles.includes("super-admin") || roles.includes("admin")) return true

  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
  const teamMemberService = req.scope.resolve("teamMemberModuleService") as any
  const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
  const userId = req.user?.id

  const membership = await workspaceMemberService.getMembership(project.workspace_id, userId)
  if (!membership) return false
  if (membership.role === "admin") return true

  const userTeamIds = await teamMemberService.getUserTeamIds(userId)
  const accessibleProjectIds = await projectMemberService.getAccessibleProjectIds(userId, userTeamIds)
  return accessibleProjectIds.includes(project.id)
}
