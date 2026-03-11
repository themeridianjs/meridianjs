import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
  const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
  const teamMemberService = req.scope.resolve("teamMemberModuleService") as any
  const userService = req.scope.resolve("userModuleService") as any
  const userId = req.user?.id

  const wsIdsParam = req.query.workspace_ids as string | undefined
  const projIdsParam = req.query.project_ids as string | undefined

  const wsIds = wsIdsParam ? wsIdsParam.split(",").filter(Boolean) : []
  const projIds = projIdsParam ? projIdsParam.split(",").filter(Boolean) : []

  let userIdSet = new Set<string>()

  // Step 1: Collect user IDs from workspace members
  if (wsIds.length > 0) {
    const wsMembers = await workspaceMemberService.listWorkspaceMembers(
      { workspace_id: wsIds.length === 1 ? wsIds[0] : wsIds }
    )
    for (const m of wsMembers) userIdSet.add(m.user_id)
  } else if (projIds.length === 0) {
    // No filters — scope to user's accessible workspaces
    const accessibleWsIds = await workspaceMemberService.getWorkspaceIdsForUser(userId)
    if (accessibleWsIds.length > 0) {
      const wsMembers = await workspaceMemberService.listWorkspaceMembers(
        { workspace_id: accessibleWsIds.length === 1 ? accessibleWsIds[0] : accessibleWsIds }
      )
      for (const m of wsMembers) userIdSet.add(m.user_id)
    }
  }

  // Step 2: If project IDs given, collect project members + team members
  if (projIds.length > 0) {
    const projectUserIds = new Set<string>()
    for (const pid of projIds) {
      const projectMembers = await projectMemberService.listProjectMembers(pid)
      for (const m of projectMembers) projectUserIds.add(m.user_id)

      const teamIds = await projectMemberService.listProjectTeamIds(pid)
      for (const teamId of teamIds) {
        const teamUserIds = await teamMemberService.getTeamMemberUserIds(teamId)
        for (const uid of teamUserIds) projectUserIds.add(uid)
      }
    }

    // Intersect with workspace set if both filters active
    if (wsIds.length > 0) {
      userIdSet = new Set([...projectUserIds].filter((id) => userIdSet.has(id)))
    } else {
      userIdSet = projectUserIds
    }
  }

  if (userIdSet.size === 0) {
    res.json({ members: [] })
    return
  }

  const userMapResult = await userService.listUsersByIds([...userIdSet])
  const members = [...userIdSet]
    .map((id) => {
      const u = userMapResult.get(id)
      if (!u) return null
      return {
        id: u.id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        avatar_url: u.avatar_url ?? null,
      }
    })
    .filter(Boolean)

  res.json({ members })
}
