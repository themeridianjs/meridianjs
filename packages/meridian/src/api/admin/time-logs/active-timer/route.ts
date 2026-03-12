import type { Response } from "express"
import { sseManager } from "@meridianjs/framework"

export const GET = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const userId = req.user?.id ?? "system"

  const timer = await issueService.getActiveTimerForUser(userId)
  if (!timer) {
    res.json({ active_timer: null })
    return
  }

  // Enrich with issue identifier, title, and project identifier
  let issue_identifier: string | null = null
  let issue_title: string | null = null
  let project_identifier: string | null = null
  try {
    const issue = await issueService.retrieveIssue(timer.issue_id)
    if (issue) {
      issue_identifier = issue.identifier ?? null
      issue_title = issue.title ?? null
      if (issue.project_id) {
        const projectService = req.scope.resolve("projectModuleService") as any
        const project = await projectService.retrieveProject(issue.project_id)
        project_identifier = project?.identifier ?? null
      }
    }
  } catch {
    // Issue may have been deleted — still return timer
  }

  res.json({
    active_timer: {
      ...timer,
      issue_identifier,
      issue_title,
      project_identifier,
    },
  })
}

export const POST = async (req: any, res: Response) => {
  const issueService = req.scope.resolve("issueModuleService") as any
  const userId = req.user?.id ?? "system"

  const stopped = await issueService.stopTimerForUser(userId)
  if (!stopped) {
    res.status(404).json({ error: { message: "No active timer found." } })
    return
  }
  if (stopped.workspace_id) {
    sseManager.broadcast(stopped.workspace_id, "timer.stopped", { issue_id: stopped.issue_id, user_id: userId })
  }
  res.json({ time_log: stopped })
}
