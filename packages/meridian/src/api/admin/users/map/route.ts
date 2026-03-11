import type { Response, NextFunction } from "express"

/**
 * Lightweight endpoint that returns ALL users with only the fields needed
 * for lookup maps and dropdowns. No pagination — intended for in-app
 * reference data (user names, initials, avatars).
 */
export const GET = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userService = req.scope.resolve("userModuleService") as any
    const users = await userService.listUsers({})
    const mapped = (users as any[]).map((u) => ({
      id: u.id,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      avatar_url: u.avatar_url ?? null,
    }))
    res.json({ users: mapped })
  } catch (err) {
    next(err)
  }
}
