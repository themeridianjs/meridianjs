import type { Response } from "express"

export const POST = async (req: any, res: Response) => {
  const notifService = req.scope.resolve("notificationModuleService") as any
  const notification = await notifService.markAsRead(req.params.id)
  res.json({ notification })
}
