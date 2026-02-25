/// <reference types="vite/client" />

const BASE_URL = window.__MERIDIAN_CONFIG__?.apiUrl ?? import.meta.env.VITE_API_URL ?? ""

/**
 * Creates an EventSource connected to GET /admin/events.
 * Passes the JWT as a query param because EventSource cannot set custom headers.
 */
export function createEventSource(token: string): EventSource {
  const url = `${BASE_URL}/admin/events?token=${encodeURIComponent(token)}`
  return new EventSource(url)
}
