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

    const es = createEventSource(token)
    esRef.current = es

    const invalidate = (keys: unknown[][]) => {
      keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))
    }

    es.addEventListener("issue.created", () => {
      invalidate([["issues"], ["notifications"]])
    })

    es.addEventListener("issue.status_changed", () => {
      invalidate([["issues"]])
    })

    es.addEventListener("issue.assigned", () => {
      invalidate([["issues"], ["notifications"]])
    })

    es.addEventListener("comment.created", () => {
      invalidate([["issues"], ["notifications"]])
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
