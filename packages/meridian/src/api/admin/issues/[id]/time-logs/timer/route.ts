import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const active = await issueService.getActiveTimer(req.params.id, req.user?.id ?? "system")
  res.json({ active_timer: active ?? null })
}

export const POST = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const { action } = req.body
  if (action !== "start" && action !== "stop") {
    res.status(400).json({ error: { message: "action must be 'start' or 'stop'." } })
    return
  }
  if (action === "start") {
    const issue = await issueService.retrieveIssue(req.params.id).catch(() => null)
    if (!issue) { res.status(404).json({ error: { message: "Issue not found." } }); return }
    const entry = await issueService.startTimer(req.params.id, req.user?.id ?? "system", issue.workspace_id, issue.project_id ?? undefined)
    res.status(201).json({ time_log: entry })
    return
  }
  const entry = await issueService.stopTimer(req.params.id, req.user?.id ?? "system")
  res.json({ time_log: entry })
}
