import { useLocation, useParams } from "react-router-dom"
import { Bell, Layers, GitBranch, LayoutDashboard, Settings } from "lucide-react"
import { ThemeToggle } from "@/components/theme/ThemeToggle"
import { Button } from "@/components/ui/button"
import { useUnreadCount } from "@/api/hooks/useNotifications"
import { Link } from "react-router-dom"
import { useProjects } from "@/api/hooks/useProjects"

interface BreadcrumbDef {
  icon: React.ElementType
  label: string
}

function useBreadcrumb(): BreadcrumbDef {
  const location = useLocation()
  const { projectId } = useParams<{ projectId: string }>()
  const { data: projects } = useProjects()
  const project = projects?.find((p) => p.id === projectId)

  const path = location.pathname
  if (path.includes("/board"))
    return { icon: Layers, label: project ? `${project.name} / Board` : "Board" }
  if (path.includes("/issues"))
    return { icon: GitBranch, label: project ? `${project.name} / Issues` : "Issues" }
  if (path === "/projects" || path === "/")
    return { icon: LayoutDashboard, label: "Projects" }
  if (path.startsWith("/notifications"))
    return { icon: Bell, label: "Notifications" }
  if (path.startsWith("/settings"))
    return { icon: Settings, label: "Settings" }
  return { icon: LayoutDashboard, label: "Meridian" }
}

export function Header() {
  const { data: unreadCount = 0 } = useUnreadCount()
  const { icon: Icon, label } = useBreadcrumb()

  return (
    <header className="flex items-center justify-between h-[57px] px-6 border-b border-border bg-[hsl(60_5%_96%)] dark:bg-background shrink-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
        <span className="font-medium text-foreground">{label}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon-sm"
          asChild
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Link to="/notifications">
            <Bell className="h-[18px] w-[18px]" strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-indigo text-[9px] font-bold text-white flex items-center justify-center leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        </Button>
      </div>
    </header>
  )
}
