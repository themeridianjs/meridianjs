import type { Response } from "express"

/** Mark a single notification as read */
export const POST = async (req: any, res: Response) => {
  const notifService = req.scope.resolve("notificationModuleService") as any
  const notification = await notifService.markAsRead(req.params.id)
  res.json({ notification })
}
