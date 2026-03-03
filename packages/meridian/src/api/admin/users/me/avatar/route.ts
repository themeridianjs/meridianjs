import type { Response } from "express"
import { processUpload, deleteUpload } from "../../../../../utils/upload.js"

/**
 * POST /admin/users/me/avatar
 * Upload / replace the authenticated user's avatar image.
 * Expects multipart/form-data with field name "avatar".
 */
export const POST = async (req: any, res: Response) => {
  const userId = req.user?.id as string
  if (!userId) {
    res.status(401).json({ error: { message: "Not authenticated" } })
    return
  }

  const userService = req.scope.resolve("userModuleService") as any
  const existing = await userService.retrieveUser(userId).catch(() => null)
  if (!existing) {
    res.status(404).json({ error: { message: "User not found." } })
    return
  }

  const upload = await processUpload(req, res, "avatar", "user-avatars")
  if (!upload) {
    res.status(400).json({ error: { message: "No file uploaded. Use multipart/form-data with field name 'avatar'." } })
    return
  }

  if (existing.avatar_url) await deleteUpload(req, existing.avatar_url)

  const user = await userService.updateUser(userId, { avatar_url: upload.url })
  const { password_hash: _, ...safeUser } = user
  res.json({ user: safeUser })
}

/**
 * DELETE /admin/users/me/avatar
 * Remove the authenticated user's avatar.
 */
export const DELETE = async (req: any, res: Response) => {
  const userId = req.user?.id as string
  if (!userId) {
    res.status(401).json({ error: { message: "Not authenticated" } })
    return
  }

  const userService = req.scope.resolve("userModuleService") as any
  const existing = await userService.retrieveUser(userId).catch(() => null)
  if (!existing) {
    res.status(404).json({ error: { message: "User not found." } })
    return
  }

  if (existing.avatar_url) await deleteUpload(req, existing.avatar_url)
  await userService.updateUser(userId, { avatar_url: null })
  res.json({ ok: true })
}
