import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const userService = req.scope.resolve("userModuleService") as any
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const offset = Number(req.query.offset) || 0

  const [users, count] = await userService.listAndCountUsers({}, { limit, offset })

  // Strip password_hash before sending
  const safeUsers = (users as any[]).map(({ password_hash: _, ...u }) => u)

  res.json({ users: safeUsers, count, limit, offset })
}
