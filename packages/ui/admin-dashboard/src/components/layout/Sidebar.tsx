import { NavLink, useParams } from "react-router-dom"
import {
  LayoutDashboard,
  Bell,
  Settings,
  Search,
  MoreHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useProjects } from "@/api/hooks/useProjects"
import { useAuth } from "@/stores/auth"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut } from "lucide-react"

interface NavItemDef {
  label: string
  href: string
  icon: React.ElementType
  end?: boolean
}

function NavItem({ item }: { item: NavItemDef }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.href}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors relative",
          "text-[#6b7280] hover:text-foreground hover:bg-[#f3f4f6] dark:text-muted-foreground dark:hover:bg-muted",
          isActive && [
            "text-foreground font-medium",
            "bg-[#eff6ff] dark:bg-[hsl(var(--indigo-subtle))]",
            "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
            "before:w-0.5 before:h-5 before:rounded-full before:bg-indigo",
          ]
        )
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
      <span>{item.label}</span>
    </NavLink>
  )
}

function SubNavItem({ label, href }: { label: string; href: string }) {
  return (
    <NavLink
      to={href}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 pl-[2.375rem] pr-3 py-1.5 rounded-md text-[13px] transition-colors relative",
          "text-[#6b7280] hover:text-foreground hover:bg-[#f3f4f6] dark:text-muted-foreground dark:hover:bg-muted",
          isActive && [
            "text-foreground font-medium",
            "bg-[#eff6ff] dark:bg-[hsl(var(--indigo-subtle))]",
            "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
            "before:w-0.5 before:h-4 before:rounded-full before:bg-indigo",
          ]
        )
      }
    >
      {label}
    </NavLink>
  )
}

export function Sidebar() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: projects } = useProjects()
  const { user, logout } = useAuth()

  const currentProject = projects?.find((p) => p.id === projectId)

  const initials = user
    ? `${user.first_name?.[0] ?? ""}`.toUpperCase()
    : "?"

  return (
    <aside className="flex flex-col h-full w-[240px] shrink-0 bg-white dark:bg-card border-r border-border">
      {/* Workspace header */}
      <div className="flex items-center justify-between h-[57px] px-4 border-b border-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-6 w-6 rounded-md bg-foreground flex items-center justify-center shrink-0">
            <span className="text-background text-[11px] font-bold">
              {(user?.first_name?.[0] ?? "M").toUpperCase()}
            </span>
          </div>
          <span className="font-medium text-sm text-foreground truncate">
            {user?.first_name && user?.last_name
              ? `${user.first_name} ${user.last_name}`
              : "Meridian"}
          </span>
        </div>
        <button className="text-muted-foreground hover:text-foreground transition-colors ml-2 shrink-0">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 py-3 space-y-0.5">
          {/* Search */}
          <button className="w-full flex items-center justify-between px-3 py-1.5 rounded-md text-sm text-[#6b7280] dark:text-muted-foreground hover:text-foreground hover:bg-[#f3f4f6] dark:hover:bg-muted transition-colors">
            <div className="flex items-center gap-2.5">
              <Search className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
              <span>Search</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] text-muted-foreground font-mono">
              ⌘K
            </kbd>
          </button>

          <Separator className="my-2" />

          {/* Main nav */}
          <NavItem
            item={{ label: "Projects", href: "/projects", icon: LayoutDashboard, end: true }}
          />
          <NavItem item={{ label: "Notifications", href: "/notifications", icon: Bell }} />

          {/* Current project section */}
          {projectId && (
            <>
              <Separator className="my-2" />
              <p className="px-3 py-1 text-[11px] font-medium text-[#9ca3af] dark:text-muted-foreground uppercase tracking-wider">
                {currentProject?.name ?? "Project"}
              </p>
              <SubNavItem
                label="Board"
                href={`/projects/${projectId}/board`}
              />
              <SubNavItem
                label="Issues"
                href={`/projects/${projectId}/issues`}
              />
            </>
          )}

          {/* Extensions / quick project links */}
          {projects && projects.length > 0 && (
            <>
              <Separator className="my-2" />
              <p className="px-3 py-1 text-[11px] font-medium text-[#9ca3af] dark:text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Recent</span>
              </p>
              {projects.slice(0, 5).map((p) => (
                <SubNavItem
                  key={p.id}
                  label={p.name}
                  href={`/projects/${p.id}/board`}
                />
              ))}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-border space-y-0.5">
        <NavItem item={{ label: "Settings", href: "/settings", icon: Settings }} />

        {/* User row */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center justify-between px-3 py-1.5 rounded-md hover:bg-[#f3f4f6] dark:hover:bg-muted transition-colors group">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-5 w-5 rounded-full bg-foreground flex items-center justify-center shrink-0">
                  <span className="text-background text-[10px] font-medium">{initials}</span>
                </div>
                <span className="text-[13px] text-[#6b7280] dark:text-muted-foreground truncate">
                  {user?.email ?? ""}
                </span>
              </div>
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-48">
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
