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

/**
 * PATCH /admin/users/me
 * Update the current user's personal details.
 * Allowed fields: first_name, last_name, designation, phone_number.
 */
export const PATCH = async (req: any, res: Response) => {
  const userService = req.scope.resolve("userModuleService") as any
  const userId = req.user?.id as string

  if (!userId) {
    res.status(401).json({ error: { message: "Not authenticated" } })
    return
  }

  const { first_name, last_name, designation, phone_number } = req.body as Record<string, unknown>
  const updates: Record<string, unknown> = {}
  if (first_name !== undefined) updates.first_name = first_name
  if (last_name !== undefined) updates.last_name = last_name
  if (designation !== undefined) updates.designation = designation
  if (phone_number !== undefined) updates.phone_number = phone_number

  const user = await userService.updateUser(userId, updates)
  const { password_hash: _, ...safeUser } = user
  res.json({ user: safeUser })
}
