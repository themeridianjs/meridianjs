import type { Response } from "express"

/**
 * Manages Server-Sent Event (SSE) connections grouped by workspace.
 * Subscribers call broadcast() after mutations; the frontend receives live updates
 * and invalidates the relevant TanStack Query cache entries.
 */
export class SseManager {
  private clients: Map<string, Set<Response>> = new Map()

  /**
   * Registers a response as an SSE client for the given workspace.
   * Returns an unsubscribe function to call on connection close.
   */
  subscribe(workspaceId: string, res: Response): () => void {
    if (!this.clients.has(workspaceId)) {
      this.clients.set(workspaceId, new Set())
    }
    this.clients.get(workspaceId)!.add(res)

    return () => {
      const set = this.clients.get(workspaceId)
      if (set) {
        set.delete(res)
        if (set.size === 0) this.clients.delete(workspaceId)
      }
    }
  }

  /**
   * Sends an SSE event to all connected clients in the given workspace.
   */
  broadcast(workspaceId: string, event: string, data: unknown): void {
    const set = this.clients.get(workspaceId)
    if (!set?.size) return

    const safeEvent = event.replace(/[\r\n]/g, "")
    const payload = `event: ${safeEvent}\ndata: ${JSON.stringify(data)}\n\n`
    const dead: Response[] = []

    for (const res of set) {
      try {
        res.write(payload)
      } catch {
        dead.push(res)
      }
    }

    for (const res of dead) {
      set.delete(res)
    }
    if (set.size === 0) this.clients.delete(workspaceId)
  }
}

/** Singleton shared across all routes and subscribers. */
export const sseManager = new SseManager()
