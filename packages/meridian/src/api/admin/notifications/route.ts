import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const notifService = req.scope.resolve("notificationModuleService") as any
  const userId = req.user?.id
  if (!userId) { res.status(401).json({ error: { message: "Unauthorized" } }); return }
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const offset = Number(req.query.offset) || 0
  const unreadOnly = req.query.unread === "true"
  const [notifications, count] = await notifService.listNotificationsForUser(userId, { limit, offset, unreadOnly })
  res.json({ notifications, count, limit, offset })
}
