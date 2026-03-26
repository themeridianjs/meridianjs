import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useProjects, useDeleteProject } from "@/api/hooks/useProjects"
import { useWorkspaces } from "@/api/hooks/useWorkspaces"
import { useRequestProjectAccess, useCancelProjectAccessRequest } from "@/api/hooks/useProjectAccess"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog"
import { ProjectAccessDialog } from "@/components/projects/ProjectAccessDialog"
import { TransferProjectDialog } from "@/components/projects/TransferProjectDialog"
import { Plus, MoreHorizontal, Layers, GitBranch, Trash2, Search, Lock, ArrowRightLeft, UserPlus, X } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export function ProjectsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [accessProject, setAccessProject] = useState<{ id: string; name: string } | null>(null)
  const [transferProject, setTransferProject] = useState<{ id: string; name: string } | null>(null)
  const [confirmProject, setConfirmProject] = useState<{ id: string; name: string } | null>(null)
  const [confirmMessage, setConfirmMessage] = useState("")
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "archived">("all")
  const { workspace } = useParams<{ workspace: string }>()
  const { data: projects, isLoading } = useProjects()
  const { data: allWorkspaces } = useWorkspaces()
  const deleteProject = useDeleteProject()
  const requestAccess = useRequestProjectAccess()
  const cancelAccess = useCancelProjectAccessRequest()
  const navigate = useNavigate()

  const currentWorkspace = allWorkspaces?.find((w) => w.slug === workspace)

  // A project is "pending" if server says so OR user requested access this session
  const isPending = (p: { id: string; has_pending_request?: boolean }) =>
    p.has_pending_request || requestedIds.has(p.id)

  const filtered = (projects ?? []).filter(
    (p) =>
      (statusFilter === "all" || p.status === statusFilter) &&
      (!search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.identifier.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="p-2 pb-24 md:pb-2">
      {/* Content card */}
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h1 className="text-base font-semibold">Projects</h1>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </div>
        {/* Card toolbar */}
        <div className="flex flex-col gap-2 px-4 md:px-6 py-3 md:py-4 border-b border-border md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {(["all", "active", "paused", "archived"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3 h-7 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0",
                  statusFilter === s
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 w-full md:w-[200px] text-xs bg-transparent"
            />
          </div>
        </div>

        {/* Desktop table header */}
        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_40px] items-center px-6 py-2.5 border-b border-border">
          <span className="text-xs font-medium text-[#6b7280]">Project</span>
          <span className="text-xs font-medium text-[#6b7280]">Identifier</span>
          <span className="text-xs font-medium text-[#6b7280]">Status</span>
          <span className="text-xs font-medium text-[#6b7280]">Created</span>
          <span />
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <>
                <div key={`d-${i}`} className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_40px] items-center px-6 py-3">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                  <div />
                </div>
                <div key={`m-${i}`} className="md:hidden flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
              </>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <Layers className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">
              {search || statusFilter !== "all" ? "No projects match" : "No projects yet"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {search || statusFilter !== "all" ? "Try adjusting your filters." : "Create your first project to get started."}
            </p>
            {!search && statusFilter === "all" && (
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Create project
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((project) => (
              <div key={project.id}>
                {/* Desktop row */}
                <div
                  className={cn(
                    "hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_40px] items-center px-6 py-3 transition-colors group",
                    project.is_member === false
                      ? "opacity-60 cursor-default"
                      : "hover:bg-[#f9fafb] dark:hover:bg-muted/30 cursor-pointer"
                  )}
                  onClick={() => project.is_member !== false && navigate(`/${workspace}/projects/${project.identifier}/board`)}
                >
                  {/* Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">
                      {project.name}
                    </span>
                    {project.is_member === false && isPending(project) && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">Pending</span>
                    )}
                    {(project.pending_request_count ?? 0) > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white shrink-0">
                        {project.pending_request_count}
                      </span>
                    )}
                    {project.description && (
                      <span className="text-xs text-muted-foreground truncate hidden xl:block">
                        {project.description}
                      </span>
                    )}
                  </div>
                  {/* Identifier */}
                  <span className="text-sm text-muted-foreground font-mono">
                    {project.identifier}
                  </span>
                  {/* Status */}
                  <div>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 text-xs",
                      project.status === "active" && "text-emerald-600",
                      project.status === "paused" && "text-amber-600",
                      project.status === "archived" && "text-muted-foreground"
                    )}>
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full shrink-0",
                        project.status === "active" && "bg-emerald-500",
                        project.status === "paused" && "bg-amber-500",
                        project.status === "archived" && "bg-zinc-400"
                      )} />
                      {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </span>
                  </div>
                  {/* Created */}
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(project.created_at), "MMM d, yyyy")}
                  </span>
                  {/* Actions */}
                  <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {project.is_member === false ? (
                          <>
                            <DropdownMenuItem
                              disabled={isPending(project)}
                              onClick={() => { if (!isPending(project)) { setConfirmProject({ id: project.id, name: project.name }); setConfirmMessage("") } }}
                            >
                              <UserPlus className="h-4 w-4" />
                              {isPending(project) ? "Request pending" : "Request access"}
                            </DropdownMenuItem>
                            {isPending(project) && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                disabled={cancelAccess.isPending}
                                onClick={() => cancelAccess.mutate(project.id, {
                                  onSuccess: () => {
                                    setRequestedIds((prev) => { const next = new Set(prev); next.delete(project.id); return next })
                                    toast.success("Access request cancelled")
                                  },
                                  onError: () => toast.error("Failed to cancel request"),
                                })}
                              >
                                <X className="h-4 w-4" />
                                Cancel request
                              </DropdownMenuItem>
                            )}
                          </>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={() => navigate(`/${workspace}/projects/${project.identifier}/board`)}>
                              <Layers className="h-4 w-4" />
                              Open board
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/${workspace}/projects/${project.identifier}/issues`)}>
                              <GitBranch className="h-4 w-4" />
                              View issues
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAccessProject({ id: project.id, name: project.name })}>
                              <Lock className="h-4 w-4" />
                              Manage access
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTransferProject({ id: project.id, name: project.name })}>
                              <ArrowRightLeft className="h-4 w-4" />
                              Transfer to workspace
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                if (confirm(`Delete "${project.name}"? This cannot be undone.`)) {
                                  deleteProject.mutate(project.id, {
                                    onSuccess: () => toast.success("Project deleted"),
                                    onError: () => toast.error("Failed to delete project"),
                                  })
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Mobile card */}
                <div
                  className={cn(
                    "md:hidden flex items-center gap-3 px-4 py-3 transition-colors",
                    project.is_member === false
                      ? "opacity-60 cursor-default"
                      : "hover:bg-[#f9fafb] dark:hover:bg-muted/30 cursor-pointer"
                  )}
                  onClick={() => project.is_member !== false && navigate(`/${workspace}/projects/${project.identifier}/issues`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-foreground truncate">{project.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">{project.identifier}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full shrink-0",
                        project.status === "active" && "bg-emerald-500",
                        project.status === "paused" && "bg-amber-500",
                        project.status === "archived" && "bg-zinc-400"
                      )} />
                      <span className={cn(
                        "text-xs",
                        project.status === "active" && "text-emerald-600",
                        project.status === "paused" && "text-amber-600",
                        project.status === "archived" && "text-muted-foreground"
                      )}>
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(project.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" className="h-8 w-8 text-muted-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {project.is_member === false ? (
                          <>
                            <DropdownMenuItem
                              disabled={isPending(project)}
                              onClick={() => { if (!isPending(project)) { setConfirmProject({ id: project.id, name: project.name }); setConfirmMessage("") } }}
                            >
                              <UserPlus className="h-4 w-4" />
                              {isPending(project) ? "Request pending" : "Request access"}
                            </DropdownMenuItem>
                            {isPending(project) && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                disabled={cancelAccess.isPending}
                                onClick={() => cancelAccess.mutate(project.id, {
                                  onSuccess: () => {
                                    setRequestedIds((prev) => { const next = new Set(prev); next.delete(project.id); return next })
                                    toast.success("Access request cancelled")
                                  },
                                  onError: () => toast.error("Failed to cancel request"),
                                })}
                              >
                                <X className="h-4 w-4" />
                                Cancel request
                              </DropdownMenuItem>
                            )}
                          </>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={() => navigate(`/${workspace}/projects/${project.identifier}/issues`)}>
                              <GitBranch className="h-4 w-4" />
                              View issues
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAccessProject({ id: project.id, name: project.name })}>
                              <Lock className="h-4 w-4" />
                              Manage access
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTransferProject({ id: project.id, name: project.name })}>
                              <ArrowRightLeft className="h-4 w-4" />
                              Transfer to workspace
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                if (confirm(`Delete "${project.name}"? This cannot be undone.`)) {
                                  deleteProject.mutate(project.id, {
                                    onSuccess: () => toast.success("Project deleted"),
                                    onError: () => toast.error("Failed to delete project"),
                                  })
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer / pagination info */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              1 — {filtered.length} of {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>1 of 1 pages</span>
              <Button variant="ghost" size="sm" className="h-7 text-xs" disabled>Prev</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" disabled>Next</Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!confirmProject} onOpenChange={(open) => { if (!open) setConfirmProject(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Request access to {confirmProject?.name}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">
              A request will be sent to the project managers. You'll be notified once it's approved.
            </p>
            <Input
              placeholder="Optional message..."
              value={confirmMessage}
              onChange={(e) => setConfirmMessage(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmProject(null)}>Cancel</Button>
            <Button
              size="sm"
              disabled={requestAccess.isPending}
              onClick={() => {
                if (!confirmProject) return
                requestAccess.mutate(
                  { projectId: confirmProject.id, message: confirmMessage.trim() || undefined },
                  {
                    onSuccess: () => {
                      setRequestedIds((prev) => new Set([...prev, confirmProject.id]))
                      setConfirmProject(null)
                      toast.success("Access request sent")
                    },
                    onError: (err: any) => {
                      toast.error(err.message ?? "Failed to send request")
                      setConfirmProject(null)
                    },
                  }
                )
              }}
            >
              {requestAccess.isPending ? "Sending..." : "Send request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />

      {accessProject && (
        <ProjectAccessDialog
          open={!!accessProject}
          onClose={() => setAccessProject(null)}
          projectId={accessProject.id}
          projectName={accessProject.name}
        />
      )}

      {transferProject && (
        <TransferProjectDialog
          open={!!transferProject}
          onClose={() => setTransferProject(null)}
          projectId={transferProject.id}
          projectName={transferProject.name}
          currentWorkspaceId={currentWorkspace?.id ?? ""}
        />
      )}
    </div>
  )
}
