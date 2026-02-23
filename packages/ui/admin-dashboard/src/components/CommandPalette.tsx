import { useNavigate } from "react-router-dom"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useCommandPalette } from "@/stores/command-palette"
import { useProjects } from "@/api/hooks/useProjects"
import { useAuth } from "@/stores/auth"
import {
  LayoutDashboard,
  Layers,
  GitBranch,
  Bell,
  Settings,
} from "lucide-react"

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette()
  const navigate = useNavigate()
  const { data: projects } = useProjects()
  const { workspace } = useAuth()
  const ws = workspace?.slug ?? ""

  const runCommand = (fn: () => void) => {
    setOpen(false)
    fn()
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search or jump to..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => navigate(`/${ws}/projects`))}>
            <LayoutDashboard className="text-muted-foreground" />
            <span>Projects</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate(`/${ws}/notifications`))}>
            <Bell className="text-muted-foreground" />
            <span>Notifications</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate(`/${ws}/settings`))}>
            <Settings className="text-muted-foreground" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>

        {/* Projects */}
        {projects && projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {projects.map((project) => (
                <CommandItem
                  key={`${project.id}-board`}
                  value={`${project.name} board`}
                  onSelect={() => runCommand(() => navigate(`/${ws}/projects/${project.identifier}/board`))}
                >
                  <Layers className="text-muted-foreground" />
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                      {project.identifier}
                    </span>
                    <span className="truncate">{project.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">Board</span>
                  </div>
                </CommandItem>
              ))}
              {projects.map((project) => (
                <CommandItem
                  key={`${project.id}-issues`}
                  value={`${project.name} issues`}
                  onSelect={() => runCommand(() => navigate(`/${ws}/projects/${project.identifier}/issues`))}
                >
                  <GitBranch className="text-muted-foreground" />
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                      {project.identifier}
                    </span>
                    <span className="truncate">{project.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">Issues</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
