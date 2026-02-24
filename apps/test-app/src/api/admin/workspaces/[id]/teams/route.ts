import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const userService = req.scope.resolve("userModuleService") as any
  const teamMemberService = req.scope.resolve("teamMemberModuleService") as any

  const [teams] = await userService.listAndCountTeams(
    { workspace_id: req.params.id },
    { limit: 100 }
  )

  // Enrich with member count
  const enriched = await Promise.all(
    teams.map(async (t: any) => {
      const memberIds = await teamMemberService.getTeamMemberUserIds(t.id)
      return { ...t, member_count: memberIds.length }
    })
  )

  res.json({ teams: enriched, count: enriched.length })
}

export const POST = async (req: any, res: Response) => {
  const userService = req.scope.resolve("userModuleService") as any
  const { name, description, icon } = req.body

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: { message: "name is required" } })
    return
  }

  const team = await userService.createTeam({
    workspace_id: req.params.id,
    name: name.trim(),
    description: description ?? null,
    icon: icon ?? null,
  })

  res.status(201).json({ team })
}
