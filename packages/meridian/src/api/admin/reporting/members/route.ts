import type { Response } from "express"
import type { WorkspaceMemberModuleService } from "@meridianjs/workspace-member"
import type { ProjectMemberModuleService } from "@meridianjs/project-member"
import type { TeamMemberModuleService } from "@meridianjs/team-member"
import type { UserModuleService } from "@meridianjs/user"
import { getAccessibleWorkspaceIds } from "../../../utils/workspace-access.js"

export const GET = async (req: any, res: Response) => {
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as WorkspaceMemberModuleService
  const projectMemberService = req.scope.resolve("projectMemberModuleService") as ProjectMemberModuleService
  const teamMemberService = req.scope.resolve("teamMemberModuleService") as TeamMemberModuleService
  const userService = req.scope.resolve("userModuleService") as UserModuleService
  const userId = req.user?.id

  const wsIdsParam = req.query.workspace_ids as string | undefined
  const projIdsParam = req.query.project_ids as string | undefined

  const rawWsIds = wsIdsParam ? wsIdsParam.split(",").filter(Boolean) : []
  const projIds = projIdsParam ? projIdsParam.split(",").filter(Boolean) : []

  // Super-admin org-scope bypass: return members from all workspaces without privacy filtering
  const roles: string[] = req.user?.roles ?? []
  if (roles.includes("super-admin") && req.query.org_scope === "true") {
    let userIdSet = new Set<string>()
    if (rawWsIds.length > 0) {
      const wsMembers = await workspaceMemberService.listWorkspaceMembers(
        { workspace_id: rawWsIds.length === 1 ? rawWsIds[0] : rawWsIds } as any
      )
      for (const m of wsMembers as any[]) userIdSet.add(m.user_id)
    } else {
      const [allMembers] = await (workspaceMemberService as any).listAndCountWorkspaceMembers({}, { limit: 5000 })
      for (const m of allMembers as any[]) userIdSet.add(m.user_id)
    }
    if (userIdSet.size === 0) { res.json({ members: [] }); return }
    const userMapResult = await (userService as any).listUsersByIds([...userIdSet])
    const members = [...userIdSet].map((id) => {
      const u = userMapResult.get(id)
      if (!u) return null
      return { id: u.id, email: u.email, first_name: u.first_name, last_name: u.last_name, avatar_url: u.avatar_url ?? null }
    }).filter(Boolean)
    res.json({ members })
    return
  }

  // Filter workspace IDs to only those the user can access (public + private where member)
  let wsIds = rawWsIds
  if (rawWsIds.length > 0) {
    wsIds = await getAccessibleWorkspaceIds(req, rawWsIds)
  }

  let userIdSet = new Set<string>()

  // Step 1: Collect user IDs from workspace members
  if (wsIds.length > 0) {
    const wsMembers = await workspaceMemberService.listWorkspaceMembers(
      { workspace_id: wsIds.length === 1 ? wsIds[0] : wsIds } as any
    )
    for (const m of wsMembers as any[]) userIdSet.add(m.user_id)
  } else if (projIds.length === 0) {
    // No filters — scope to user's accessible workspaces
    const accessibleWsIds = await workspaceMemberService.getWorkspaceIdsForUser(userId)
    if (accessibleWsIds.length > 0) {
      const wsMembers = await workspaceMemberService.listWorkspaceMembers(
        { workspace_id: accessibleWsIds.length === 1 ? accessibleWsIds[0] : accessibleWsIds } as any
      )
      for (const m of wsMembers as any[]) userIdSet.add(m.user_id)
    }
  }

  // Step 2: If project IDs given, collect project members + team members (batched)
  if (projIds.length > 0) {
    const projectUserIds = new Set<string>()

    const projectMembers = await projectMemberService.listProjectMembersForProjects(projIds)
    for (const m of projectMembers) projectUserIds.add(m.user_id)

    const projectTeams = await projectMemberService.listProjectTeamIdsForProjects(projIds)
    const teamIds = projectTeams.map((t) => t.team_id)
    const teamUserIds = await teamMemberService.getTeamMemberUserIdsForTeams(teamIds)
    for (const uid of teamUserIds) projectUserIds.add(uid)

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

  const userMapResult = await (userService as any).listUsersByIds([...userIdSet])
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
