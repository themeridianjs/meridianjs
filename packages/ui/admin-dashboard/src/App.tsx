import { Navigate, Route, Routes, useNavigate, useParams, useLocation } from "react-router-dom"
import { useEffect, lazy, Suspense, type ReactNode } from "react"
import { useAuth } from "@/stores/auth"
import { useWorkspaces } from "@/api/hooks/useWorkspaces"
import { useSetupStatus } from "@/api/hooks/useAuth"
import { useRealtimeEvents } from "@/hooks/useRealtimeEvents"
import { AppShell } from "@/components/layout/AppShell"
import { ProjectLayout } from "@/components/layout/ProjectLayout"
import { ReportingLayout } from "@/components/layout/ReportingLayout"
import { OrgSettingsLayout } from "@/components/layout/OrgSettingsLayout"
import { ProfileLayout } from "@/components/layout/ProfileLayout"
import { CommandPalette } from "@/components/CommandPalette"
import { LoginPage } from "@/pages/LoginPage"
import { RegisterPage } from "@/pages/RegisterPage"
import { SetupWorkspacePage } from "@/pages/SetupWorkspacePage"
import { AwaitingAccessPage } from "@/pages/AwaitingAccessPage"
import { ProjectsPage } from "@/pages/ProjectsPage"
import { ProjectBoardPage } from "@/pages/ProjectBoardPage"
import { ProjectIssuesPage } from "@/pages/ProjectIssuesPage"
import { ProjectAccessPage } from "@/pages/ProjectAccessPage"
import { IssueDetailPage } from "@/pages/IssueDetailPage"
import { IssueNewPage } from "@/pages/IssueNewPage"
import { MyTasksPage } from "@/pages/MyTasksPage"
import { NotificationsPage } from "@/pages/NotificationsPage"
import { SprintsPage } from "@/pages/SprintsPage"
import { WorkspaceSettingsPage } from "@/pages/WorkspaceSettingsPage"
import { RolesPage } from "@/pages/RolesPage"
import { InviteAcceptPage } from "@/pages/InviteAcceptPage"
import { ReportingPage } from "@/pages/ReportingPage"
import { ProjectReportsPage } from "@/pages/ProjectReportsPage"
import { ProjectActivityPage } from "@/pages/ProjectActivityPage"
import { OrgSettingsPage } from "@/pages/OrgSettingsPage"
import { PublicProjectPage } from "@/pages/public/PublicProjectPage"
import { GoogleCallbackPage } from "@/pages/GoogleCallbackPage"
import { ProfilePage } from "@/pages/ProfilePage"
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage"
import { ResetPasswordPage } from "@/pages/ResetPasswordPage"

const ProjectTimelinePage = lazy(() => import("@/pages/ProjectTimelinePage").then(m => ({ default: m.ProjectTimelinePage })))
const WorkspaceReportingPage = lazy(() => import("@/pages/WorkspaceReportingPage").then(m => ({ default: m.WorkspaceReportingPage })))

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user?.roles?.includes("super-admin")) return <Navigate to="/" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const isGlobalAdmin = user?.roles?.includes("super-admin") || user?.roles?.includes("admin")
  const hasWorkspaceAdmin = user?.permissions?.includes("workspace:admin")
  if (isGlobalAdmin || hasWorkspaceAdmin) return <>{children}</>
  return <Navigate to="/" replace />
}

function RedirectIfAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const { data: setupStatus } = useSetupStatus()
  const location = useLocation()

  if (isAuthenticated) return <Navigate to="/" replace />

  // First-time setup: redirect /login → /register when no users exist yet
  if (setupStatus?.needsSetup && location.pathname === "/login") {
    return <Navigate to="/register" replace />
  }

  // After first setup, /register is only accessible when open registration is enabled
  if (setupStatus && !setupStatus.needsSetup && !setupStatus.registrationEnabled && location.pathname === "/register") {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

/** Redirects to the stored or first available workspace, or /setup if none. */
function WorkspaceRedirect() {
  const { workspace, setWorkspace, user } = useAuth()
  const navigate = useNavigate()
  // Always fetch workspaces to validate the stored workspace is still accessible
  const { data: workspaces, isLoading } = useWorkspaces()

  useEffect(() => {
    if (isLoading) return
    if (workspaces === undefined) return

    // If we have a stored workspace, validate it's still in the accessible list
    if (workspace) {
      const stillAccessible = workspaces.some((w) => w.id === workspace.id)
      if (stillAccessible) {
        navigate(`/${workspace.slug}/projects`, { replace: true })
        return
      }
      // Stored workspace is no longer accessible — clear it and fall through
      setWorkspace(null)
    }

    if (workspaces.length > 0) {
      const w = workspaces[0]
      setWorkspace({ id: w.id, name: w.name, slug: w.slug })
      navigate(`/${w.slug}/projects`, { replace: true })
    } else {
      const isPrivileged = user?.roles?.includes("super-admin") || user?.roles?.includes("admin")
      navigate(isPrivileged ? "/setup" : "/awaiting-access", { replace: true })
    }
  }, [workspaces, isLoading, navigate, setWorkspace, user, workspace])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="text-sm text-muted-foreground">Loading...</span>
    </div>
  )
}

/** Reads :workspace slug from URL, validates it, sets it in auth store, renders AppShell. */
function WorkspaceLayout() {
  const { workspace: slugParam } = useParams<{ workspace: string }>()
  const { workspace, setWorkspace, user } = useAuth()
  useRealtimeEvents()
  const navigate = useNavigate()
  const { data: workspaces, isLoading, isFetching } = useWorkspaces()

  useEffect(() => {
    if (isLoading || !workspaces) return
    const found = workspaces.find((w) => w.slug === slugParam)
    if (found) {
      if (found.id !== workspace?.id) {
        setWorkspace({ id: found.id, name: found.name, slug: found.slug })
      }
    } else if (isFetching) {
      // Still refetching — wait for fresh data before redirecting
      return
    } else if (workspaces.length > 0) {
      // Current workspace not accessible, switch to first available
      setWorkspace({ id: workspaces[0].id, name: workspaces[0].name, slug: workspaces[0].slug })
      navigate(`/${workspaces[0].slug}/projects`, { replace: true })
    } else {
      // No accessible workspaces at all — clear stale ref and redirect
      setWorkspace(null)
      const isPrivileged = user?.roles?.includes("super-admin") || user?.roles?.includes("admin")
      navigate(isPrivileged ? "/setup" : "/awaiting-access", { replace: true })
    }
  }, [workspaces, slugParam, isLoading, isFetching, workspace?.id, navigate, setWorkspace, user])

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
      <Route
        path="/forgot-password"
        element={
          <RedirectIfAuth>
            <ForgotPasswordPage />
          </RedirectIfAuth>
        }
      />
      <Route
        path="/reset-password"
        element={
          <RedirectIfAuth>
            <ResetPasswordPage />
          </RedirectIfAuth>
        }
      />

      {/* Invite accept — fully public, no auth required */}
      <Route path="/invite/:token" element={<InviteAcceptPage />} />

      {/* Google OAuth callback — fully public, outside /auth/* prefix so Vite proxy doesn't intercept */}
      <Route path="/oauth/google/callback" element={<GoogleCallbackPage />} />

      {/* Public project share — no auth required */}
      <Route path="/share/:token" element={<PublicProjectPage />} />

      {/* Global reporting — admin/super-admin only */}
      <Route
        path="/reporting"
        element={
          <RequireAuth>
            <RequireAdmin>
              <ReportingLayout />
            </RequireAdmin>
          </RequireAuth>
        }
      >
        <Route index element={<ReportingPage />} />
      </Route>

      {/* Org settings — admin/super-admin only */}
      <Route
        path="/org/settings"
        element={
          <RequireAuth>
            <RequireAdmin>
              <OrgSettingsLayout />
            </RequireAdmin>
          </RequireAuth>
        }
      >
        <Route index element={<OrgSettingsPage />} />
      </Route>

      {/* User profile — auth required, workspace-independent */}
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <ProfileLayout />
          </RequireAuth>
        }
      >
        <Route index element={<ProfilePage />} />
      </Route>

      {/* Workspace setup — auth required, no workspace needed */}
      <Route
        path="/setup"
        element={
          <RequireAuth>
            <SetupWorkspacePage />
          </RequireAuth>
        }
      />

      {/* Awaiting access — member with no workspace yet */}
      <Route
        path="/awaiting-access"
        element={
          <RequireAuth>
            <AwaitingAccessPage />
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
        <Route path="projects/:projectKey" element={<ProjectLayout />}>
          <Route path="board" element={<ProjectBoardPage />} />
          <Route path="issues" element={<ProjectIssuesPage />} />
          <Route path="issues/new" element={<IssueNewPage />} />
          <Route path="issues/:issueId" element={<IssueDetailPage />} />
          <Route path="sprints" element={<SprintsPage />} />
          <Route path="timeline" element={<Suspense fallback={<div className="flex items-center justify-center h-full text-sm text-muted-foreground">Loading…</div>}><ProjectTimelinePage /></Suspense>} />
          <Route path="access" element={<ProjectAccessPage />} />
          <Route path="reports" element={<ProjectReportsPage />} />
          <Route path="activity" element={<ProjectActivityPage />} />
        </Route>
        <Route path="my-tasks" element={<MyTasksPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="reporting" element={<Suspense fallback={<div className="flex items-center justify-center h-full text-sm text-muted-foreground">Loading…</div>}><WorkspaceReportingPage /></Suspense>} />
        <Route path="settings" element={<WorkspaceSettingsPage />} />
        <Route path="roles" element={<RequireSuperAdmin><RolesPage /></RequireSuperAdmin>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
