import type { Response } from "express"

/**
 * DELETE /admin/users/me/google
 * Unlinks the Google account from the currently authenticated user.
 */
export const DELETE = async (req: any, res: Response) => {
  const userId = req.user?.id as string
  if (!userId) {
    res.status(401).json({ error: { message: "Not authenticated" } })
    return
  }

  const userService = req.scope.resolve("userModuleService") as any
  await userService.updateUser(userId, { google_id: null })
  res.json({ ok: true })
}
