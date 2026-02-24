import type { Response } from "express"

export const POST = async (req: any, res: Response) => {
  const notifService = req.scope.resolve("notificationModuleService") as any
  const userId = req.user?.id
  if (!userId) { res.status(401).json({ error: { message: "Unauthorized" } }); return }
  await notifService.markAllAsRead(userId)
  res.json({ ok: true })
}
