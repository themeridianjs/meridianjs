import type { Response } from "express"
import { sseManager } from "@meridianjs/framework"

/**
 * GET /admin/events?token=<jwt>
 *
 * SSE stream scoped to the authenticated user's workspace.
 * Uses a query-param token because EventSource does not support custom headers.
 * authenticateJWT middleware accepts ?token= as fallback and populates req.user.
 */
export const GET = (req: any, res: Response) => {
  const workspaceId: string = req.user?.workspaceId

  if (!workspaceId) {
    res.status(400).json({ error: { message: "No workspace associated with this token" } })
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
