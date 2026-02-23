import { useLocation, useParams, Link } from "react-router-dom"
import { Bell, Layers, GitBranch, LayoutDashboard, Settings } from "lucide-react"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useUnreadCount } from "@/api/hooks/useNotifications"
import { useProjects } from "@/api/hooks/useProjects"
import { useAuth } from "@/stores/auth"

function useBreadcrumb() {
  const location = useLocation()
  const { projectKey } = useParams<{ projectKey: string }>()
  const { data: projects } = useProjects()
  const project = projects?.find((p) => p.identifier === projectKey)

  const path = location.pathname
  if (path.includes("/board"))
    return { icon: Layers, label: project ? `${project.name} / Board` : "Board" }
  if (path.includes("/issues"))
    return { icon: GitBranch, label: project ? `${project.name} / Issues` : "Issues" }
  if (path.endsWith("/projects"))
    return { icon: LayoutDashboard, label: "Projects" }
  if (path.includes("/notifications"))
    return { icon: Bell, label: "Notifications" }
  if (path.includes("/settings"))
    return { icon: Settings, label: "Settings" }
  return { icon: LayoutDashboard, label: "Meridian" }
}

export function Header() {
  const { data: unreadCount = 0 } = useUnreadCount()
  const { icon: Icon, label } = useBreadcrumb()
  const { workspace } = useAuth()
  const ws = workspace?.slug ?? ""

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear w-full">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {/* Sidebar toggle */}
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <span className="font-medium">{label}</span>
        </div>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="relative size-8 text-muted-foreground hover:text-foreground"
          >
            <Link to={`/${ws}/notifications`}>
              <Bell className="h-4 w-4" strokeWidth={1.5} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-indigo text-[9px] font-bold text-white flex items-center justify-center leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
