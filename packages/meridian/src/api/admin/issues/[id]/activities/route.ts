import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const activityService = req.scope.resolve("activityModuleService") as any
  const activities = await activityService.listActivityForEntity("issue", req.params.id)
  activities.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  res.json({ activities })
}
