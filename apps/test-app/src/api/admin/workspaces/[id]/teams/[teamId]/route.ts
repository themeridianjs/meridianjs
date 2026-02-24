import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const userService = req.scope.resolve("userModuleService") as any
  const team = await userService.retrieveTeam(req.params.teamId)
  res.json({ team })
}

export const PUT = async (req: any, res: Response) => {
  const userService = req.scope.resolve("userModuleService") as any
  const { name, description, icon } = req.body
  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name.trim()
  if (description !== undefined) updates.description = description
  if (icon !== undefined) updates.icon = icon

  const team = await userService.updateTeam(req.params.teamId, updates)
  res.json({ team })
}

export const DELETE = async (req: any, res: Response) => {
  const userService = req.scope.resolve("userModuleService") as any
  const teamMemberService = req.scope.resolve("teamMemberModuleService") as any

  // Remove all team members first
  await teamMemberService.deleteAllForTeam(req.params.teamId)
  await userService.deleteTeam(req.params.teamId)
  res.status(204).send()
}
