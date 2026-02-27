import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  avatar_url?: string
  roles: string[]
}

export interface WorkspaceRef {
  id: string
  name: string
  slug: string
}

interface AuthState {
  user: User | null
  token: string | null
  workspace: WorkspaceRef | null
  isAuthenticated: boolean
  login: (user: Omit<User, "roles">, token: string) => void
  logout: () => void
  setWorkspace: (w: WorkspaceRef | null) => void
}

const AuthContext = createContext<AuthState | null>(null)

const TOKEN_KEY = "meridian_token"
const USER_KEY = "meridian_user"
const WORKSPACE_KEY = "meridian_workspace"

function decodeTokenRoles(token: string): string[] {
  try {
    // JWT uses base64url — replace url-safe chars and add padding before atob
    const base64url = token.split(".")[1]
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(
      base64url.length + (4 - (base64url.length % 4)) % 4,
      "="
    )
    const payload = JSON.parse(atob(base64))
    return Array.isArray(payload.roles) ? payload.roles : []
  } catch {
    return []
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY)
      const token = localStorage.getItem(TOKEN_KEY)
      if (!stored) return null
      const parsed = JSON.parse(stored) as User
      // Ensure roles field is present — decode from token if missing
      if (!Array.isArray(parsed.roles)) {
        parsed.roles = token ? decodeTokenRoles(token) : []
      }
      return parsed
    } catch {
      return null
    }
  })
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY)
  })
  const [workspace, setWorkspaceState] = useState<WorkspaceRef | null>(() => {
    try {
      const stored = localStorage.getItem(WORKSPACE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = (rawUser: Omit<User, "roles">, newToken: string) => {
    const roles = decodeTokenRoles(newToken)
    const userWithRoles: User = { ...rawUser, roles }
    setUser(userWithRoles)
    setToken(newToken)
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(userWithRoles))
  }

  const logout = () => {
    // Fire-and-forget: revoke the session on the server so the token can't be reused
    const currentToken = localStorage.getItem(TOKEN_KEY)
    if (currentToken) {
      fetch("/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}`, "Content-Type": "application/json" },
      }).catch(() => {})
    }
    setUser(null)
    setToken(null)
    setWorkspaceState(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(WORKSPACE_KEY)
  }

  const setWorkspace = (w: WorkspaceRef | null) => {
    setWorkspaceState(w)
    if (w) {
      localStorage.setItem(WORKSPACE_KEY, JSON.stringify(w))
    } else {
      localStorage.removeItem(WORKSPACE_KEY)
    }
  }

  useEffect(() => {
    if (token && !user) {
      logout()
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, token, workspace, isAuthenticated: !!token && !!user, login, logout, setWorkspace }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
