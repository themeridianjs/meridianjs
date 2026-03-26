import type { Response } from "express"
import { hasProjectAccess } from "../../../../utils/project-access.js"

export const GET = async (req: any, res: Response) => {
  const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
  const projectService = req.scope.resolve("projectModuleService") as any
  const userService = req.scope.resolve("userModuleService") as any
  const teamMemberService = req.scope.resolve("teamMemberModuleService") as any

  const projectRef = req.params.id
  const project =
    (await projectService.retrieveProject(projectRef).catch(() => null)) ??
    (await projectService.retrieveProjectByIdentifier?.(projectRef).catch(() => null))

  if (!project) {
    res.status(404).json({ error: { message: `Project "${projectRef}" not found` } })
    return
  }

  if (!await hasProjectAccess(req, project)) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }

  const projectId = project.id

  // Ensure the project owner is always a project member (handles projects created
  // before ensureProjectMember was introduced, and acts as a defensive guarantee)
  try {
    if (project?.owner_id) {
      await projectMemberService.ensureProjectMember(projectId, project.owner_id, "manager")
    }
  } catch { /* project may not exist or owner already a member */ }

  const members = await projectMemberService.listProjectMembers(projectId)
  const teamEntries = await projectMemberService.listProjectTeamIds(projectId)

  // Batch-fetch all member users in a single query
  const userMap = await userService.listUsersByIds(members.map((m: any) => m.user_id))

  // Resolve app role names for all members
  let appRoleMap = new Map<string, string>()
  try {
    const appRoleService = req.scope.resolve("appRoleModuleService") as any
    const roleIds = [...new Set(
      [...userMap.values()].map((u: any) => u.app_role_id).filter(Boolean)
    )]
    if (roleIds.length > 0) {
      const [roles] = await appRoleService.listAndCountAppRoles({ id: roleIds }, { limit: roleIds.length })
      for (const r of roles) appRoleMap.set(r.id, r.name)
    }
  } catch { /* app-role module may not be loaded */ }

  const enrichedMembers = members.map((m: any) => {
    const user = userMap.get(m.user_id) ?? null
    const appRoleName = user?.app_role_id ? (appRoleMap.get(user.app_role_id) ?? null) : null
    return user
      ? { id: m.id, user_id: m.user_id, role: m.role, app_role_name: appRoleName, user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, app_role_id: user.app_role_id ?? null } }
      : { id: m.id, user_id: m.user_id, role: m.role, app_role_name: null, user: null }
  })

  const enrichedTeams = await Promise.all(
    teamEntries.map(async (t: any) => {
      try {
        const team = await userService.retrieveTeam(t.team_id)
        const memberIds = await teamMemberService.getTeamMemberUserIds(t.team_id)
        return { id: t.id, team_id: t.team_id, team: { ...team, member_count: memberIds.length } }
      } catch {
        return { id: t.id, team_id: t.team_id, team: null }
      }
    })
  )

  res.json({ members: enrichedMembers, teams: enrichedTeams })
}
