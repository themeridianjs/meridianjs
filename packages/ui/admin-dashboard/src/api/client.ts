/// <reference types="vite/client" />

declare global {
  interface Window {
    __MERIDIAN_CONFIG__?: { apiUrl?: string }
  }
}

// Priority: injected config (production static serving) > Vite env var > relative (Vite dev proxy)
const BASE_URL = window.__MERIDIAN_CONFIG__?.apiUrl ?? import.meta.env.VITE_API_URL ?? ""

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

function getToken(): string | null {
  return localStorage.getItem("meridian_token")
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers })

  if (!res.ok) {
    let data: unknown
    try {
      data = await res.json()
    } catch {
      data = null
    }
    const message =
      (data as { error?: { message?: string } })?.error?.message ??
      `HTTP ${res.status}`
    throw new ApiError(res.status, message, data)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),

  /** Upload a file using multipart/form-data. Omits Content-Type so browser sets boundary. */
  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) headers["Authorization"] = `Bearer ${token}`

    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: formData,
    })

    if (!res.ok) {
      let data: unknown
      try { data = await res.json() } catch { data = null }
      const message =
        (data as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`
      throw new ApiError(res.status, message, data)
    }

    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  },
}
