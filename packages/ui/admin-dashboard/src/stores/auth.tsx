import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  avatar_url?: string
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
  login: (user: User, token: string) => void
  logout: () => void
  setWorkspace: (w: WorkspaceRef | null) => void
}

const AuthContext = createContext<AuthState | null>(null)

const TOKEN_KEY = "meridian_token"
const USER_KEY = "meridian_user"
const WORKSPACE_KEY = "meridian_workspace"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY)
      return stored ? JSON.parse(stored) : null
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

  const login = (user: User, token: string) => {
    setUser(user)
    setToken(token)
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }

  const logout = () => {
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
