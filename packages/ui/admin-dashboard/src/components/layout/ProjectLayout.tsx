import { NavLink, Link, Outlet, useParams, useNavigate, useSearchParams, useLocation, Navigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { Zap, GitBranch, LayoutDashboard, Lock, CalendarRange, BarChart2, Share2, Activity } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useProjectByKey } from "@/api/hooks/useProjects"
import { useProjectAccess, useProjectAccessRequests } from "@/api/hooks/useProjectAccess"
import { useProjectHealthUpdates, type ProjectHealthUpdate } from "@/api/hooks/useProjectHealth"
import { useAuth } from "@/stores/auth"
import { Button } from "@/components/ui/button"
import { ShareProjectDialog } from "@/components/projects/ShareProjectDialog"
import { ApiError } from "@/api/client"
import { useIsMobile } from "@/lib/hooks"

type HealthStatus = ProjectHealthUpdate["health"]

const HEALTH_BADGE: Record<HealthStatus, { label: string; dot: string; badge: string }> = {
  on_track: {
    label: "On track",
    dot: "bg-green-500",
    badge: "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/40 dark:border-green-800",
  },
  delayed: {
    label: "Delayed",
    dot: "bg-orange-500",
    badge: "text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950/40 dark:border-orange-800",
  },
  on_hold: {
    label: "On hold",
    dot: "bg-yellow-500",
    badge: "text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950/40 dark:border-yellow-800",
  },
  completed: {
    label: "Completed",
    dot: "bg-indigo-500",
    badge: "text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950/40 dark:border-indigo-800",
  },
}

const PROJECT_TAB_ROUTES = ["board", "issues", "sprints", "timeline", "access", "reports", "activity"] as const

export function ProjectLayout() {
  const { projectKey, workspace: ws } = useParams<{ projectKey: string; workspace: string }>()
  const { data: project, error } = useProjectByKey(projectKey ?? "")
  const { user } = useAuth()
  const { data: projectAccess } = useProjectAccess(project?.id ?? "")
  const { data: accessRequestsData } = useProjectAccessRequests(project?.id ?? "")
  const pendingAccessRequestCount = (accessRequestsData?.requests ?? []).filter((r) => r.status === "pending").length
  const { data: healthUpdates } = useProjectHealthUpdates(project?.id)
  const latestHealth = healthUpdates?.[0] ?? null
  const [shareOpen, setShareOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isMobile = useIsMobile()

  // Show Share button only for workspace/project admins and project managers
  const userRoles = user?.roles ?? []
  const isPrivileged = userRoles.includes("super-admin") || userRoles.includes("admin")
  const isProjectManager = projectAccess?.members.some(
    (m) => m.user_id === user?.id && m.role === "manager"
  )
  const canShare = isPrivileged || isProjectManager

  // Redirect on access denied or not found
  useEffect(() => {
    if (!error || !(error instanceof ApiError)) return
    if (error.status === 404) {
      navigate(`/${ws}/projects`, { replace: true })
    } else if (error.status === 403) {
      navigate(`/${ws}/projects/${projectKey}/request-access`, { replace: true })
    }
  }, [error, ws, navigate, projectKey])

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (!tab || !PROJECT_TAB_ROUTES.includes(tab as any)) return
    // Only redirect if we're at the layout root (no sub-route active yet)
    const isAtRoot = PROJECT_TAB_ROUTES.every(
      (r) => !location.pathname.endsWith(`/${r}`)
    )
    if (isAtRoot) {
      navigate(`/${ws}/projects/${projectKey}/${tab}`, { replace: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally run once on mount to consume the ?tab= query param

  const base = `/${ws}/projects/${projectKey}`
  const allTabs: { to: string; label: string; icon: LucideIcon; end: boolean; mobileOnly?: boolean; desktopOnly?: boolean }[] = [
    { to: `${base}/board`, label: "Board", icon: LayoutDashboard, end: true, desktopOnly: true },
    { to: `${base}/issues`, label: "Issues", icon: GitBranch, end: false },
    { to: `${base}/sprints`, label: "Sprints", icon: Zap, end: true },
    { to: `${base}/timeline`, label: "Timeline", icon: CalendarRange, end: true, desktopOnly: true },
    { to: `${base}/access`, label: "Access", icon: Lock, end: true },
    { to: `${base}/reports`, label: "Reports", icon: BarChart2, end: true },
    { to: `${base}/activity`, label: "Activity", icon: Activity, end: true },
  ]

  const desktopTabs = allTabs
  const mobileTabs = allTabs.filter((t) => !t.desktopOnly)

  // On mobile, redirect board/timeline → issues
  const isBoardOrTimeline = location.pathname.endsWith("/board") || location.pathname.endsWith("/timeline")
  if (isMobile && isBoardOrTimeline) {
    return <Navigate to={`${base}/issues`} replace />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Project header with tabs */}
      <div className="border-b border-border bg-white dark:bg-card shrink-0 px-4 pt-4 md:px-6 md:pt-5">
        {/* Project name row */}
        <div className="flex items-center gap-2.5 mb-3 md:mb-4">
          {project && (
            <span className="text-xs font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded">
              {project.identifier}
            </span>
          )}
          <h1 className="text-sm font-semibold">
            {project?.name ?? ""}
          </h1>
          {latestHealth && (
            <Link to={`health`} className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border transition-opacity hover:opacity-80",
              HEALTH_BADGE[latestHealth.health].badge,
            )}>
              <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", HEALTH_BADGE[latestHealth.health].dot)} />
              {HEALTH_BADGE[latestHealth.health].label}
            </Link>
          )}
        </div>

        {/* Desktop tab bar */}
        <div className="hidden md:flex items-center -mb-px">
          <div className="flex flex-1">
            {desktopTabs.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors ${isActive
                    ? "border-foreground text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                {label}
                {label === "Access" && pendingAccessRequestCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                    {pendingAccessRequestCount > 9 ? "9+" : pendingAccessRequestCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
          {project && (
            <div className="pb-px">
              <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs text-muted-foreground">
                <Link to="health">
                  <Activity className="h-3.5 w-3.5 mr-1" />
                  Status
                </Link>
              </Button>
            </div>
          )}
          {canShare && project && (
            <div className="pb-px pr-1">
              <Button variant="ghost" size="sm" onClick={() => setShareOpen(true)} className="h-7 px-2 text-xs text-muted-foreground">
                <Share2 className="h-3.5 w-3.5 mr-1" />
                Share
              </Button>
            </div>
          )}
        </div>

        {/* Mobile tab bar — scrollable, no Board/Timeline */}
        <div className="flex md:hidden overflow-x-auto -mb-px scrollbar-none">
          {mobileTabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 whitespace-nowrap transition-colors shrink-0 ${isActive
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
                }`
              }
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {label}
              {label === "Access" && pendingAccessRequestCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                  {pendingAccessRequestCount > 9 ? "9+" : pendingAccessRequestCount}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Page content */}
      <div className="flex flex-col flex-1 min-h-0">
        <Outlet />
      </div>

      {project && (
        <ShareProjectDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          project={project}
        />
      )}
    </div>
  )
}
