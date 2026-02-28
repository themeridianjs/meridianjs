import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"

export const GET = async (req: any, res: Response) => {
  const teamMemberService = req.scope.resolve("teamMemberModuleService") as any
  const userService = req.scope.resolve("userModuleService") as any

  const [members] = await teamMemberService.listAndCountTeamMembers(
    { team_id: req.params.teamId },
    { limit: 100 }
  )

  const enriched = await Promise.all(
    members.map(async (m: any) => {
      try {
        const user = await userService.retrieveUser(m.user_id)
        return {
          id: m.id,
          user_id: m.user_id,
          user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name },
        }
      } catch {
        return { id: m.id, user_id: m.user_id, user: null }
      }
    })
  )

  res.json({ members: enriched, count: enriched.length })
}

export const POST = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("team:manage_members")(req, res, async () => {
    try {
      const teamMemberService = req.scope.resolve("teamMemberModuleService") as any
      const { user_id } = req.body

      if (!user_id) {
        res.status(400).json({ error: { message: "user_id is required" } })
        return
      }

      if (await teamMemberService.isMember(req.params.teamId, user_id)) {
        res.status(409).json({ error: { message: "User is already a member of this team" } })
        return
      }

      const member = await teamMemberService.createTeamMember({
        team_id: req.params.teamId,
        user_id,
      })

      res.status(201).json({ member })
    } catch (err) {
      next(err)
    }
  })
}
