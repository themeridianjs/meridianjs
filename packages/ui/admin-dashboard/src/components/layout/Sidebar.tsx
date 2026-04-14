import { NavLink, useParams, useNavigate, useLocation } from "react-router-dom"
import {
  Layers,
  Bell,
  Settings,
  Settings2,
  Search,
  Check,
  CheckSquare,
  ChevronsUpDown,
  LogOut,
  Shield,
  BarChart2,
  User as UserIcon,
  Users,
  Lock,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { useProjects } from "@/api/hooks/useProjects"
import { useWorkspaces, useSearchWorkspaces, useRequestWorkspaceAccess, useWorkspaceAccessRequests } from "@/api/hooks/useWorkspaces"
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
import { useState } from "react"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// ── Workspace Switcher (header) ───────────────────────────────────────────────

function WorkspaceSwitcher() {
  const { workspace, setWorkspace } = useAuth()
  const { data: workspaces } = useWorkspaces()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const { data: allPublic = [] } = useSearchWorkspaces("", { enabled: dropdownOpen })
  const requestAccess = useRequestWorkspaceAccess()
  const navigate = useNavigate()

  // Track which workspaces the user has already requested access to (local state)
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set())
  const [confirmWorkspace, setConfirmWorkspace] = useState<{ id: string; name: string } | null>(null)
  const [confirmMessage, setConfirmMessage] = useState("")

  const sortedWorkspaces = [...(workspaces ?? [])].sort((a, b) => a.name.localeCompare(b.name))
  const joinable = allPublic.filter((w) => !w.is_member).sort((a, b) => a.name.localeCompare(b.name))

  const handleConfirmRequest = () => {
    if (!confirmWorkspace) return
    requestAccess.mutate(
      { workspaceId: confirmWorkspace.id, message: confirmMessage.trim() || undefined },
      {
        onSuccess: () => {
          setRequestedIds((prev) => new Set([...prev, confirmWorkspace.id]))
          toast.success(`Access request sent for ${confirmWorkspace.name}`)
          setConfirmWorkspace(null)
        },
        onError: (err: any) => {
          toast.error(err.message ?? "Failed to send request")
          setConfirmWorkspace(null)
        },
      }
    )
  }

  return (
    <>
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {workspace?.logo_url ? (
                <img src={workspace.logo_url} alt={workspace.name} className="size-8 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-foreground text-background shrink-0">
                  <span className="text-[13px] font-bold">
                    {(workspace?.name?.[0] ?? "M").toUpperCase()}
                  </span>
                </div>
              )}
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
              My workspaces
            </DropdownMenuLabel>
            <div className="max-h-48 overflow-y-auto">
              {sortedWorkspaces.map((w) => (
                <DropdownMenuItem
                  key={w.id}
                  className="cursor-pointer gap-2 p-2"
                  onClick={() => {
                    setWorkspace({ id: w.id, name: w.name, slug: w.slug, logo_url: w.logo_url })
                    navigate(`/${w.slug}/projects`)
                  }}
                >
                  {w.logo_url ? (
                    <img src={w.logo_url} alt={w.name} className="size-6 rounded-sm object-cover shrink-0" />
                  ) : (
                    <div className="flex size-6 items-center justify-center rounded-sm bg-foreground text-background shrink-0">
                      <span className="text-[10px] font-bold">{w.name[0].toUpperCase()}</span>
                    </div>
                  )}
                  <span className="flex-1 truncate">{w.name}</span>
                  {w.id === workspace?.id && (
                    <Check className="size-3.5 text-muted-foreground shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
            </div>

            {joinable.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  Other workspaces
                </DropdownMenuLabel>
                <div className="max-h-36 overflow-y-auto">
                  {joinable.map((w) => {
                    const requested = requestedIds.has(w.id)
                    return (
                      <DropdownMenuItem
                        key={w.id}
                        className="cursor-pointer gap-2 p-2"
                        onClick={() => { if (!requested) { setConfirmWorkspace({ id: w.id, name: w.name }); setConfirmMessage("") } }}
                        disabled={requested}
                      >
                        <div className="flex size-6 items-center justify-center rounded-sm bg-muted text-muted-foreground shrink-0">
                          <span className="text-[10px] font-bold">{w.name[0].toUpperCase()}</span>
                        </div>
                        <span className="flex-1 truncate text-muted-foreground">{w.name}</span>
                        {requested ? (
                          <span className="text-[10px] text-muted-foreground shrink-0">Requested</span>
                        ) : (
                          <Lock className="size-3.5 text-muted-foreground shrink-0" />
                        )}
                      </DropdownMenuItem>
                    )
                  })}
                </div>
              </>
            )}

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

    <Dialog open={!!confirmWorkspace} onOpenChange={(open) => { if (!open) setConfirmWorkspace(null) }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Request access to {confirmWorkspace?.name}?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <p className="text-sm text-muted-foreground">
            A request will be sent to the workspace admins. You'll be notified once it's approved.
          </p>
          <Input
            placeholder="Optional message to admins..."
            value={confirmMessage}
            onChange={(e) => setConfirmMessage(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setConfirmWorkspace(null)}>
            Cancel
          </Button>
          <Button size="sm" disabled={requestAccess.isPending} onClick={handleConfirmRequest}>
            {requestAccess.isPending ? "Sending..." : "Send request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  )
}

// ── User nav (footer) ─────────────────────────────────────────────────────────

function NavUser() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"
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
                {user?.avatar_url && <AvatarImage src={user.avatar_url} alt={fullName ?? ""} className="object-cover" />}
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
                  {user?.avatar_url && <AvatarImage src={user.avatar_url} alt={fullName ?? ""} className="object-cover" />}
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
              className="cursor-pointer gap-2"
              onClick={() => navigate("/profile")}
            >
              <UserIcon className="size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => navigate("/profile/timesheets")}
            >
              <Clock className="size-4" />
              Timesheets
            </DropdownMenuItem>
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
  const { workspace: workspaceSlug, projectKey } = useParams<{ workspace: string; projectKey: string }>()
  const { data: projects } = useProjects()
  const projectPendingCount = (projects ?? []).reduce((s, p) => s + (p.pending_request_count ?? 0), 0)
  const { toggle: openCommandPalette } = useCommandPalette()
  const { user, workspace: wsRef } = useAuth()
  const workspaceId = wsRef?.id ?? ""
  const _roles: string[] = user?.roles ?? []
  const _isAdmin = _roles.includes("super-admin") || _roles.includes("admin")
  const { data: _pendingRequests = [] } = useWorkspaceAccessRequests(workspaceId)
  const pendingCount = _isAdmin ? _pendingRequests.length : 0
  const location = useLocation()
  const ws = workspaceSlug ?? ""

  const isProjectsActive = location.pathname === `/${ws}/projects`
  const isMyTasksActive = location.pathname === `/${ws}/my-tasks`
  const isNotificationsActive = location.pathname.includes("/notifications")
  const isSettingsActive = location.pathname.includes("/settings")
  const isRolesActive = location.pathname.includes("/roles")
  const isWorkspaceReportingActive = location.pathname === `/${ws}/reporting`
  const isGlobalReportingActive = location.pathname.startsWith("/reporting")
  const isTeamDashboardActive = location.pathname.startsWith("/team")
  const isOrgSettingsActive = location.pathname.startsWith("/org/settings")
  const isSuperAdmin = user?.roles?.includes("super-admin") ?? false
  const isGlobalAdmin = isSuperAdmin || (user?.roles?.includes("admin") ?? false)
  const hasWorkspaceAdmin = user?.permissions?.includes("workspace:admin") ?? false
  const isPrivileged = isGlobalAdmin || hasWorkspaceAdmin

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

              {/* My Tasks */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isMyTasksActive} tooltip="My Tasks">
                  <NavLink to={`/${ws}/my-tasks`}>
                    <CheckSquare />
                    <span>My Tasks</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Projects */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isProjectsActive} tooltip="Projects">
                  <NavLink to={`/${ws}/projects`} end>
                    <Layers />
                    <span className="flex-1">Projects</span>
                    {projectPendingCount > 0 && (
                      <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                        {projectPendingCount > 9 ? "9+" : projectPendingCount}
                      </span>
                    )}
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

              {/* Reports (workspace-scoped) */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isWorkspaceReportingActive} tooltip="Reports">
                  <NavLink to={`/${ws}/reporting`}>
                    <BarChart2 />
                    <span>Reports</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Workspace Settings */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isSettingsActive} tooltip="Settings">
                  <NavLink to={`/${ws}/settings`}>
                    <Settings />
                    <span className="flex-1">Workspace settings</span>
                    {pendingCount > 0 && (
                      <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                        {pendingCount > 9 ? "9+" : pendingCount}
                      </span>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

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
                      <SidebarMenuButton
                        asChild
                        isActive={p.identifier === projectKey}
                        tooltip={p.name}
                        className="data-[active=true]:bg-indigo-50 dark:data-[active=true]:bg-indigo-950/50 data-[active=true]:text-indigo-700 dark:data-[active=true]:text-indigo-300"
                      >
                        <NavLink to={`/${ws}/projects/${p.identifier}/board`}>
                          <span className="font-mono text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-1 py-0.5 rounded shrink-0">
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

        {/* Global section — admin/super-admin only */}
        {isPrivileged && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Global</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isGlobalReportingActive} tooltip="Global Reports">
                      <NavLink to="/reporting">
                        <BarChart2 />
                        <span>Global Reports</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isTeamDashboardActive} tooltip="Team Dashboard">
                      <NavLink to="/team">
                        <Users />
                        <span>Team Dashboard</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isOrgSettingsActive} tooltip="Org Settings">
                      <NavLink to="/org/settings">
                        <Settings2 />
                        <span>Org Settings</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Settings / Roles — pushed to bottom */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {isSuperAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isRolesActive} tooltip="Roles & Permissions">
                    <NavLink to={`/${ws}/roles`}>
                      <Shield />
                      <span>Custom Roles</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
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
