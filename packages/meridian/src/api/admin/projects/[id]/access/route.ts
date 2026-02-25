import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
  const userService = req.scope.resolve("userModuleService") as any
  const teamMemberService = req.scope.resolve("teamMemberModuleService") as any

  const members = await projectMemberService.listProjectMembers(req.params.id)
  const teamEntries = await projectMemberService.listProjectTeamIds(req.params.id)

  const enrichedMembers = await Promise.all(
    members.map(async (m: any) => {
      try {
        const user = await userService.retrieveUser(m.user_id)
        return {
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name },
        }
      } catch {
        return { id: m.id, user_id: m.user_id, role: m.role, user: null }
      }
    })
  )

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
