/// <reference types="vite/client" />

const BASE_URL = window.__MERIDIAN_CONFIG__?.apiUrl ?? import.meta.env.VITE_API_URL ?? ""

/**
 * Creates an EventSource connected to GET /admin/events.
 * Passes the JWT and workspaceId as query params because EventSource cannot set custom headers.
 * The JWT always has workspaceId=null (it's auth-level, not workspace-level), so the
 * workspace must be supplied separately from the client's workspace context.
 */
export function createEventSource(token: string, workspaceId: string): EventSource {
  const url = `${BASE_URL}/admin/events?token=${encodeURIComponent(token)}&workspaceId=${encodeURIComponent(workspaceId)}`
  return new EventSource(url)
}

/**
 * Creates an EventSource in user-only mode (no workspace required).
 * Used on pages like /awaiting-access where the user has no workspace yet.
 */
export function createUserEventSource(token: string): EventSource {
  const url = `${BASE_URL}/admin/events?token=${encodeURIComponent(token)}&mode=user`
  return new EventSource(url)
}
