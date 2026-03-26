import type { Response } from "express"
import { requirePermission } from "@meridianjs/auth"
import { sseManager } from "@meridianjs/framework"
import { hasProjectAccess } from "../../../../../utils/project-access.js"

async function assertIssueAccess(req: any, res: Response): Promise<boolean> {
  const issueService = req.scope.resolve("issueModuleService") as any
  const issue = await issueService.retrieveIssue(req.params.id).catch(() => null)
  if (!issue) {
    res.status(404).json({ error: { message: "Issue not found" } })
    return false
  }
  if (issue.project_id) {
    const projectService = req.scope.resolve("projectModuleService") as any
    const project = await projectService.retrieveProject(issue.project_id).catch(() => null)
    if (project && !await hasProjectAccess(req, project)) {
      res.status(403).json({ error: { message: "Forbidden" } })
      return false
    }
  }
  return true
}

export const GET = async (req: any, res: Response) => {
  if (!await assertIssueAccess(req, res)) return
  const issueService = req.scope.resolve("issueModuleService") as any
  const active = await issueService.getActiveTimer(req.params.id, req.user?.id ?? "system")
  res.json({ active_timer: active ?? null })
}

export const POST = async (req: any, res: Response) => {
  requirePermission("issue:update")(req, res, async () => {
    if (!await assertIssueAccess(req, res)) return
    const issueService = req.scope.resolve("issueModuleService") as any
    const { action } = req.body
    if (action !== "start" && action !== "stop") {
      res.status(400).json({ error: { message: "action must be 'start' or 'stop'." } })
      return
    }
    if (action === "start") {
      const issue = await issueService.retrieveIssue(req.params.id).catch(() => null)
      if (!issue) { res.status(404).json({ error: { message: "Issue not found." } }); return }
      const { entry, stoppedEntry } = await issueService.startTimer(req.params.id, req.user?.id ?? "system", issue.workspace_id, issue.project_id ?? undefined)
      sseManager.broadcast(issue.workspace_id, "timer.started", { issue_id: req.params.id, user_id: req.user?.id ?? "system" })
      if (stoppedEntry) {
        sseManager.broadcast(issue.workspace_id, "timer.stopped", { issue_id: stoppedEntry.issue_id, user_id: req.user?.id ?? "system" })
      }
      res.status(201).json({ time_log: entry, stopped_timer: stoppedEntry ?? null })
      return
    }
    const entry = await issueService.stopTimer(req.params.id, req.user?.id ?? "system")
    if (entry) {
      const issue = await issueService.retrieveIssue(req.params.id).catch(() => null)
      if (issue) {
        sseManager.broadcast(issue.workspace_id, "timer.stopped", { issue_id: req.params.id, user_id: req.user?.id ?? "system" })
      }
    }
    res.json({ time_log: entry })
  })
}
