import { NavLink, useParams, useNavigate, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Bell,
  Settings,
  Search,
  Check,
  ChevronsUpDown,
  LogOut,
} from "lucide-react"
import { useProjects } from "@/api/hooks/useProjects"
import { useWorkspaces } from "@/api/hooks/useWorkspaces"
import { useAuth } from "@/stores/auth"
import { useCommandPalette } from "@/stores/command-palette"
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import type { ComponentProps } from "react"
type SidebarProps = ComponentProps<typeof SidebarRoot>
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

// ── Workspace Switcher (header) ───────────────────────────────────────────────

function WorkspaceSwitcher() {
  const { workspace, setWorkspace } = useAuth()
  const { data: workspaces } = useWorkspaces()
  const navigate = useNavigate()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-foreground text-background shrink-0">
                <span className="text-[13px] font-bold">
                  {(workspace?.name?.[0] ?? "M").toUpperCase()}
                </span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{workspace?.name ?? "Meridian"}</span>
                <span className="truncate text-xs text-sidebar-foreground/60">{workspace?.slug ?? ""}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 shrink-0" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side="bottom"
            align="start"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Workspaces
            </DropdownMenuLabel>
            {workspaces?.map((w) => (
              <DropdownMenuItem
                key={w.id}
                className="cursor-pointer gap-2 p-2"
                onClick={() => {
                  setWorkspace({ id: w.id, name: w.name, slug: w.slug })
                  navigate(`/${w.slug}/projects`)
                }}
              >
                <div className="flex size-6 items-center justify-center rounded-sm bg-foreground text-background shrink-0">
                  <span className="text-[10px] font-bold">{w.name[0].toUpperCase()}</span>
                </div>
                <span className="flex-1 truncate">{w.name}</span>
                {w.id === workspace?.id && (
                  <Check className="size-3.5 text-muted-foreground shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 p-2 text-muted-foreground"
              onClick={() => navigate("/setup")}
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <span className="text-xs font-semibold">+</span>
              </div>
              <span>Create workspace</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

// ── User nav (footer) ─────────────────────────────────────────────────────────

function NavUser() {
  const { user, logout } = useAuth()
  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() || user.email[0].toUpperCase()
    : "?"
  const fullName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email
    : "User"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg shrink-0">
                <AvatarFallback className="rounded-lg bg-foreground text-background text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{fullName}</span>
                <span className="truncate text-xs text-sidebar-foreground/60">{user?.email ?? ""}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 shrink-0" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side="top"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-foreground text-background text-xs font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{fullName}</span>
                  <span className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={logout}
            >
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

// ── Main sidebar ──────────────────────────────────────────────────────────────

export function AppSidebar({ ...props }: SidebarProps) {
  const { workspace: workspaceSlug, projectId } = useParams<{ workspace: string; projectId: string }>()
  const { data: projects } = useProjects()
  const { toggle: openCommandPalette } = useCommandPalette()
  const location = useLocation()
  const ws = workspaceSlug ?? ""

  const currentProject = projects?.find((p) => p.id === projectId)

  const isProjectsActive = location.pathname === `/${ws}/projects`
  const isNotificationsActive = location.pathname.includes("/notifications")
  const isSettingsActive = location.pathname.includes("/settings")
  const isBoardActive = projectId ? location.pathname.endsWith("/board") : false
  const isIssuesActive = projectId ? location.pathname.endsWith("/issues") : false

  return (
    <SidebarRoot collapsible="offcanvas" {...props}>
      {/* Workspace switcher */}
      <SidebarHeader>
        <WorkspaceSwitcher />
      </SidebarHeader>

      <SidebarContent>
        {/* Main nav */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Search */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={openCommandPalette} tooltip="Search">
                  <Search />
                  <span>Search</span>
                  <kbd className="ml-auto hidden text-[10px] text-sidebar-foreground/40 font-mono sm:inline-flex">
                    ⌘K
                  </kbd>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Projects */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isProjectsActive} tooltip="Projects">
                  <NavLink to={`/${ws}/projects`} end>
                    <LayoutDashboard />
                    <span>Projects</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Notifications */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isNotificationsActive} tooltip="Notifications">
                  <NavLink to={`/${ws}/notifications`}>
                    <Bell />
                    <span>Notifications</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Current project sub-nav */}
        {projectId && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>{currentProject?.name ?? "Project"}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isBoardActive}>
                      <NavLink to={`/${ws}/projects/${projectId}/board`}>
                        Board
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isIssuesActive}>
                      <NavLink to={`/${ws}/projects/${projectId}/issues`}>
                        Issues
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Recent projects */}
        {projects && projects.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Recent</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {projects.slice(0, 5).map((p) => (
                    <SidebarMenuItem key={p.id}>
                      <SidebarMenuButton asChild isActive={p.id === projectId} tooltip={p.name}>
                        <NavLink to={`/${ws}/projects/${p.id}/board`}>
                          <span className="font-mono text-[11px] text-sidebar-foreground/50 shrink-0">
                            {p.identifier}
                          </span>
                          <span className="truncate">{p.name}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Settings — pushed to bottom */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isSettingsActive} tooltip="Settings">
                  <NavLink to={`/${ws}/settings`}>
                    <Settings />
                    <span>Settings</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User footer */}
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </SidebarRoot>
  )
}
