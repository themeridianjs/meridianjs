import type { Response } from "express"

/**
 * GET /admin/users/me
 * Returns the currently authenticated user's profile.
 * Requires JWT (handled by /admin/* middleware).
 */
export const GET = async (req: any, res: Response) => {
  const userService = req.scope.resolve("userModuleService") as any
  const userId = req.user?.id as string

  if (!userId) {
    res.status(401).json({ error: { message: "Not authenticated" } })
    return
  }

  const user = await userService.retrieveUser(userId)
  const { password_hash: _, ...safeUser } = user
  res.json(safeUser)
}
