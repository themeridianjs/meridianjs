import type { Response } from "express"
import { sseManager } from "@meridianjs/framework"

/**
 * GET /admin/events?token=<jwt>&workspaceId=<id>
 *
 * SSE stream scoped to the given workspace.
 * Uses query params because EventSource cannot set custom headers.
 * - token: validated by authenticateJWT middleware (sets req.user)
 * - workspaceId: passed explicitly because the JWT always has workspaceId=null
 *   (tokens are issued at auth time, not workspace-selection time)
 *
 * Validates that req.user is a member of the requested workspace before subscribing.
 */
export const GET = async (req: any, res: Response) => {
  const workspaceId = req.query.workspaceId as string | undefined

  if (!workspaceId) {
    res.status(400).json({ error: { message: "workspaceId query param required" } })
    return
  }

  // Validate the user actually belongs to this workspace
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
  const [members] = await workspaceMemberService.listAndCountWorkspaceMembers(
    { workspace_id: workspaceId, user_id: req.user.id },
    { limit: 1 }
  )

  if (members.length === 0) {
    res.status(403).json({ error: { message: "You are not a member of this workspace" } })
    return
  }

  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.setHeader("X-Accel-Buffering", "no") // disable nginx buffering

  res.flushHeaders()

  // Heartbeat every 30s to keep the connection alive through proxies
  const heartbeat = setInterval(() => {
    try { res.write(": heartbeat\n\n") } catch { clearInterval(heartbeat) }
  }, 30_000)

  const unsubscribe = sseManager.subscribe(workspaceId, res)

  req.on("close", () => {
    clearInterval(heartbeat)
    unsubscribe()
  })
}
