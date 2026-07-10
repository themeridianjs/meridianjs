import { PRIVILEGED_ROLES, ROLES, PROJECT_ROLES } from "@meridianjs/types"

/**
 * Shared project access check.
 *
 * Usage:
 *   const allowed = await hasProjectAccess(req, project)
 *   if (!allowed) { res.status(403).json({ error: { message: "Forbidden" } }); return }
 */
/** True when the caller holds an org-wide admin role. */
export function isGlobalAdmin(req: any): boolean {
  const roles: string[] = req.user?.roles ?? []
  return roles.some((r) => PRIVILEGED_ROLES.includes(r))
}

export async function hasProjectAccess(req: any, project: { id: string; workspace_id: string }): Promise<boolean> {
  if (isGlobalAdmin(req)) return true

  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
  const teamMemberService = req.scope.resolve("teamMemberModuleService") as any
  const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
  const userId = req.user?.id

  const membership = await workspaceMemberService.getMembership(project.workspace_id, userId)
  if (!membership) return false
  if (membership.role === ROLES.ADMIN) return true

  const userTeamIds = await teamMemberService.getUserTeamIds(userId)
  const accessibleProjectIds = await projectMemberService.getAccessibleProjectIds(userId, userTeamIds)
  return accessibleProjectIds.includes(project.id)
}

/**
 * Resolves project and checks if caller is a project manager, workspace admin, or global admin.
 * Returns null (and sends 404) if project doesn't exist.
 * Returns { project, isAuthorized } otherwise.
 */
export async function resolveProjectAndAccess(
  req: any,
  res: import("express").Response
): Promise<{ project: any; isAuthorized: boolean } | null> {
  const projectService = req.scope.resolve("projectModuleService") as any
  const project = await projectService.retrieveProject(req.params.id).catch(() => null)
  if (!project) {
    res.status(404).json({ error: { message: "Project not found" } })
    return null
  }

  if (isGlobalAdmin(req)) return { project, isAuthorized: true }

  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
  const wsMembership = await workspaceMemberService.getMembership(project.workspace_id, req.user?.id)
  if (wsMembership?.role === ROLES.ADMIN) return { project, isAuthorized: true }

  const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
  const members = await projectMemberService.listProjectMembers(project.id)
  const myMembership = members.find((m: any) => m.user_id === req.user?.id)
  if (myMembership?.role === PROJECT_ROLES.MANAGER) return { project, isAuthorized: true }

  return { project, isAuthorized: false }
}
