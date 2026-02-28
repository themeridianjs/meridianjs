import { NavLink, Outlet, useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom"
import { useEffect } from "react"
import { Zap, GitBranch, LayoutDashboard, Lock, CalendarRange } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useProjectByKey } from "@/api/hooks/useProjects"
import { ApiError } from "@/api/client"

const PROJECT_TAB_ROUTES = ["board", "issues", "sprints", "timeline", "access"] as const

export function ProjectLayout() {
  const { projectKey, workspace: ws } = useParams<{ projectKey: string; workspace: string }>()
  const { data: project, error } = useProjectByKey(projectKey ?? "")
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  // Redirect to projects list if access is denied or project doesn't exist
  useEffect(() => {
    if (error && error instanceof ApiError && (error.status === 403 || error.status === 404)) {
      navigate(`/${ws}/projects`, { replace: true })
    }
  }, [error, ws, navigate])

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
  const tabs: { to: string; label: string; icon: LucideIcon; end: boolean }[] = [
    { to: `${base}/board`, label: "Board", icon: LayoutDashboard, end: true },
    { to: `${base}/issues`, label: "Issues", icon: GitBranch, end: false },
    { to: `${base}/sprints`, label: "Sprints", icon: Zap, end: true },
    { to: `${base}/timeline`, label: "Timeline", icon: CalendarRange, end: true },
    { to: `${base}/access`, label: "Access", icon: Lock, end: true },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Project header with tabs */}
      <div className="px-6 pt-5 border-b border-border bg-white dark:bg-card shrink-0">
        {/* Project name row */}
        <div className="flex items-center gap-2.5 mb-4">
          {project && (
            <span className="text-xs font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded">
              {project.identifier}
            </span>
          )}
          <h1 className="text-sm font-semibold">
            {project?.name ?? ""}
          </h1>
        </div>

        {/* Tab bar */}
        <div className="flex -mb-px">
          {tabs.map(({ to, label, icon: Icon, end }) => (
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
            </NavLink>
          ))}
        </div>
      </div>

      {/* Page content */}
      <div className="flex flex-col flex-1 min-h-0">
        <Outlet />
      </div>
    </div>
  )
}
