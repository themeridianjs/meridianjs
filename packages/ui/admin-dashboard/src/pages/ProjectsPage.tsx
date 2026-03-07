import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useProjects, useDeleteProject } from "@/api/hooks/useProjects"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CreateProjectDialog } from "@/components/projects/CreateProjectDialog"
import { ProjectAccessDialog } from "@/components/projects/ProjectAccessDialog"
import { Plus, MoreHorizontal, Layers, GitBranch, Trash2, Search, Lock } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export function ProjectsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [accessProject, setAccessProject] = useState<{ id: string; name: string } | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "archived">("all")
  const { workspace } = useParams<{ workspace: string }>()
  const { data: projects, isLoading } = useProjects()
  const deleteProject = useDeleteProject()
  const navigate = useNavigate()

  const filtered = (projects ?? []).filter(
    (p) =>
      (statusFilter === "all" || p.status === statusFilter) &&
      (!search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.identifier.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="p-2">
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
                  className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_40px] items-center px-6 py-3 hover:bg-[#f9fafb] dark:hover:bg-muted/30 cursor-pointer transition-colors group"
                  onClick={() => navigate(`/${workspace}/projects/${project.identifier}/board`)}
                >
                  {/* Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">
                      {project.name}
                    </span>
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
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Mobile card */}
                <div
                  className="md:hidden flex items-center gap-3 px-4 py-3 hover:bg-[#f9fafb] dark:hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/${workspace}/projects/${project.identifier}/issues`)}
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
                        <DropdownMenuItem onClick={() => navigate(`/${workspace}/projects/${project.identifier}/issues`)}>
                          <GitBranch className="h-4 w-4" />
                          View issues
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAccessProject({ id: project.id, name: project.name })}>
                          <Lock className="h-4 w-4" />
                          Manage access
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

      <CreateProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />

      {accessProject && (
        <ProjectAccessDialog
          open={!!accessProject}
          onClose={() => setAccessProject(null)}
          projectId={accessProject.id}
          projectName={accessProject.name}
        />
      )}
    </div>
  )
}
