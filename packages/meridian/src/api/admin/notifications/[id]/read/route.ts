import type { Response } from "express"

export const POST = async (req: any, res: Response) => {
  const notifService = req.scope.resolve("notificationModuleService") as any
  const notification = await notifService.retrieveNotification(req.params.id)
  if (!notification) {
    res.status(404).json({ error: { message: "Notification not found" } })
    return
  }
  if (notification.user_id !== req.user?.id) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }
  const updated = await notifService.markAsRead(req.params.id)
  res.json({ notification: updated })
}
