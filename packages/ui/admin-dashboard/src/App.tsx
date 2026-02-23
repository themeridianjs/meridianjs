import { Navigate, Route, Routes } from "react-router-dom"
import { useAuth } from "@/stores/auth"
import { AppShell } from "@/components/layout/AppShell"
import { CommandPalette } from "@/components/CommandPalette"
import { LoginPage } from "@/pages/LoginPage"
import { RegisterPage } from "@/pages/RegisterPage"
import { ProjectsPage } from "@/pages/ProjectsPage"
import { ProjectBoardPage } from "@/pages/ProjectBoardPage"
import { ProjectIssuesPage } from "@/pages/ProjectIssuesPage"
import { NotificationsPage } from "@/pages/NotificationsPage"
import type { ReactNode } from "react"

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RedirectIfAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/projects" replace />
  return <>{children}</>
}

export function App() {
  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={
          <RedirectIfAuth>
            <LoginPage />
          </RedirectIfAuth>
        }
      />
      <Route
        path="/register"
        element={
          <RedirectIfAuth>
            <RegisterPage />
          </RedirectIfAuth>
        }
      />

      {/* Protected */}
      <Route
        element={
          <RequireAuth>
            <AppShell />
            <CommandPalette />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId/board" element={<ProjectBoardPage />} />
        <Route path="/projects/:projectId/issues" element={<ProjectIssuesPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
