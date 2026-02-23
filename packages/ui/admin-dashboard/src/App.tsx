import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom"
import { useEffect, type ReactNode } from "react"
import { useAuth } from "@/stores/auth"
import { useWorkspaces } from "@/api/hooks/useWorkspaces"
import { AppShell } from "@/components/layout/AppShell"
import { CommandPalette } from "@/components/CommandPalette"
import { LoginPage } from "@/pages/LoginPage"
import { RegisterPage } from "@/pages/RegisterPage"
import { SetupWorkspacePage } from "@/pages/SetupWorkspacePage"
import { ProjectsPage } from "@/pages/ProjectsPage"
import { ProjectBoardPage } from "@/pages/ProjectBoardPage"
import { ProjectIssuesPage } from "@/pages/ProjectIssuesPage"
import { IssueDetailPage } from "@/pages/IssueDetailPage"
import { IssueNewPage } from "@/pages/IssueNewPage"
import { NotificationsPage } from "@/pages/NotificationsPage"
import { SprintsPage } from "@/pages/SprintsPage"

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RedirectIfAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}

/** Redirects to the stored or first available workspace, or /setup if none. */
function WorkspaceRedirect() {
  const { workspace, setWorkspace } = useAuth()
  const navigate = useNavigate()
  const { data: workspaces, isLoading } = useWorkspaces(!workspace)

  useEffect(() => {
    if (workspace) {
      navigate(`/${workspace.slug}/projects`, { replace: true })
      return
    }
    if (isLoading) return
    if (workspaces !== undefined) {
      if (workspaces.length > 0) {
        const w = workspaces[0]
        setWorkspace({ id: w.id, name: w.name, slug: w.slug })
        navigate(`/${w.slug}/projects`, { replace: true })
      } else {
        navigate("/setup", { replace: true })
      }
    }
  }, [workspace, workspaces, isLoading, navigate, setWorkspace])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="text-sm text-muted-foreground">Loading...</span>
    </div>
  )
}

/** Reads :workspace slug from URL, validates it, sets it in auth store, renders AppShell. */
function WorkspaceLayout() {
  const { workspace: slugParam } = useParams<{ workspace: string }>()
  const { workspace, setWorkspace } = useAuth()
  const navigate = useNavigate()
  const { data: workspaces, isLoading } = useWorkspaces()

  useEffect(() => {
    if (isLoading || !workspaces) return
    const found = workspaces.find((w) => w.slug === slugParam)
    if (found) {
      if (found.id !== workspace?.id) {
        setWorkspace({ id: found.id, name: found.name, slug: found.slug })
      }
    } else if (workspaces.length > 0) {
      navigate(`/${workspaces[0].slug}/projects`, { replace: true })
    } else {
      navigate("/setup", { replace: true })
    }
  }, [workspaces, slugParam, isLoading, workspace?.id, navigate, setWorkspace])

  if (isLoading || !workspace || workspace.slug !== slugParam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  return (
    <>
      <AppShell />
      <CommandPalette />
    </>
  )
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

      {/* Workspace setup — auth required, no workspace needed */}
      <Route
        path="/setup"
        element={
          <RequireAuth>
            <SetupWorkspacePage />
          </RequireAuth>
        }
      />

      {/* Index — redirect to workspace */}
      <Route
        index
        element={
          <RequireAuth>
            <WorkspaceRedirect />
          </RequireAuth>
        }
      />

      {/* Workspace-scoped protected routes */}
      <Route
        path="/:workspace"
        element={
          <RequireAuth>
            <WorkspaceLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="projects" replace />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectKey/board" element={<ProjectBoardPage />} />
        <Route path="projects/:projectKey/issues" element={<ProjectIssuesPage />} />
        <Route path="projects/:projectKey/issues/new" element={<IssueNewPage />} />
        <Route path="projects/:projectKey/issues/:issueId" element={<IssueDetailPage />} />
        <Route path="projects/:projectKey/sprints" element={<SprintsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
