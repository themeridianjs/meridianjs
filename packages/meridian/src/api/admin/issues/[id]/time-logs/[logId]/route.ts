import type { Response } from "express"

export const DELETE = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const repo = req.scope.resolve("timeLogRepository") as any
  const entry = await repo.findOne({ id: req.params.logId })
  if (!entry) {
    res.status(404).json({ error: { message: "Time log not found" } })
    return
  }
  if (entry.user_id !== req.user?.id) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }
  const deleted = await issueService.deleteTimeLog(req.params.logId)
  res.json({ time_log: deleted })
}
