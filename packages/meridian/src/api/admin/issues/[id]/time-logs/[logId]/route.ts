import type { Response } from "express"

export const DELETE = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const entry = await issueService.deleteTimeLog(req.params.logId)
  res.json({ time_log: entry })
}
