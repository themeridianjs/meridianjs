import { useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/stores/auth"
import { createEventSource } from "@/lib/sse"

/**
 * Subscribes to the SSE stream at /admin/events and invalidates
 * relevant TanStack Query cache entries on receiving domain events.
 *
 * Call once at the app root (inside RequireAuth so token is available).
 */
export function useRealtimeEvents(): void {
  const { token, workspace } = useAuth()
  const queryClient = useQueryClient()
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!token || !workspace) return

    const es = createEventSource(token, workspace.id)
    esRef.current = es

    const invalidate = (keys: unknown[][]) => {
      keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))
    }

    // Scope issue invalidations to the affected project/issue instead of the
    // root ["issues"] key — otherwise one issue event refetches every board on
    // every connected client (an O(clients × events) refetch storm).
    const invalidateIssue = (raw?: string) => {
      const data = raw ? JSON.parse(raw) : {}
      const { project_id, issue_id } = data as { project_id?: string; issue_id?: string }
      if (project_id) {
        // Board (all filter variants) for this project.
        queryClient.invalidateQueries({ queryKey: ["issues", "project", project_id] })
        // Paginated lists for this project (project_id lives inside the params object).
        queryClient.invalidateQueries({
          predicate: (q) =>
            q.queryKey[0] === "issues" &&
            q.queryKey[1] === "paginated" &&
            (q.queryKey[2] as any)?.project_id === project_id,
        })
      } else {
        // No project scope in the payload — fall back to a full refresh.
        queryClient.invalidateQueries({ queryKey: ["issues"] })
      }
      if (issue_id) {
        queryClient.invalidateQueries({ queryKey: ["issues", issue_id] })
      }
    }

    es.addEventListener("issue.created", (e: MessageEvent) => {
      invalidateIssue(e.data)
      invalidate([["notifications"]])
    })

    es.addEventListener("issue.status_changed", (e: MessageEvent) => {
      invalidateIssue(e.data)
    })

    es.addEventListener("issue.assigned", (e: MessageEvent) => {
      invalidateIssue(e.data)
      invalidate([["notifications"]])
    })

    es.addEventListener("comment.created", (e: MessageEvent) => {
      invalidateIssue(e.data)
      invalidate([["notifications"]])
    })

    es.addEventListener("project.member_added", () => {
      invalidate([["notifications"]])
    })

    es.addEventListener("timer.started", () => {
      invalidate([["time-logs"]])
    })

    es.addEventListener("timer.stopped", () => {
      invalidate([["time-logs"]])
    })

    es.addEventListener("notification.created", () => {
      invalidate([["notifications"]])
    })

    es.addEventListener("workspace.access_requested", () => {
      invalidate([["workspaces", workspace?.id, "access-requests"], ["notifications"]])
    })

    es.addEventListener("workspace.access_request_resolved", () => {
      invalidate([
        ["workspaces", workspace?.id, "access-requests"],
        ["workspaces"],
        ["notifications"],
      ])
    })

    es.addEventListener("project.access_requested", (e: MessageEvent) => {
      const data = JSON.parse(e.data ?? "{}")
      invalidate([
        ["projects"],
        ["projects", data.project_id, "access-requests"],
        ["notifications"],
      ])
    })

    es.addEventListener("project.access_request_resolved", (e: MessageEvent) => {
      const data = JSON.parse(e.data ?? "{}")
      invalidate([
        ["projects"],
        ["projects", data.project_id, "access-requests"],
        ["notifications"],
      ])
    })

    es.addEventListener("project.access_request_cancelled", (e: MessageEvent) => {
      const data = JSON.parse(e.data ?? "{}")
      invalidate([
        ["projects"],
        ["projects", data.project_id, "access-requests"],
        ["notifications"],
      ])
    })

    es.addEventListener("workspace.access_request_cancelled", () => {
      invalidate([
        ["workspaces", workspace?.id, "access-requests"],
        ["notifications"],
      ])
    })

    es.onerror = () => {
      // EventSource auto-reconnects on error; nothing to do here
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [token, workspace?.id, queryClient])
}
