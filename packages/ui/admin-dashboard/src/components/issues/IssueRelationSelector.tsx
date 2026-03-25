import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { useIssues } from "@/api/hooks/useIssues"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { Check, Link2, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface IssueRelationSelectorProps {
  value: string[]
  onChange: (ids: string[]) => void
  projectId: string
  excludeId?: string
  disabled?: boolean
  emptyLabel?: string
}

export function IssueRelationSelector({
  value,
  onChange,
  projectId,
  excludeId,
  disabled,
  emptyLabel = "None",
}: IssueRelationSelectorProps) {
  const [open, setOpen] = useState(false)
  const [localValue, setLocalValue] = useState<string[]>(value)
  const { data: issues = [] } = useIssues(projectId)
  const { workspace, projectKey } = useParams<{ workspace: string; projectKey: string }>()

  const valueKey = value.slice().sort().join(",")
  useEffect(() => {
    setLocalValue(value)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKey])

  const available = issues.filter((i) => i.id !== excludeId)
  const selected = available.filter((i) => localValue.includes(i.id))

  const toggle = (id: string) => {
    const next = localValue.includes(id)
      ? localValue.filter((v) => v !== id)
      : [...localValue, id]
    setLocalValue(next)
    onChange(next)
  }

  const remove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const next = localValue.filter((v) => v !== id)
    setLocalValue(next)
    onChange(next)
  }

  const openIssue = (e: React.MouseEvent, issueId: string) => {
    e.stopPropagation()
    if (workspace && projectKey) {
      window.open(`/${workspace}/projects/${projectKey}/issues/${issueId}`, "_blank")
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "flex flex-wrap items-center gap-1 min-h-[28px] w-full rounded-md px-1 py-1",
            "transition-colors text-left",
            selected.length === 0 && "hover:bg-accent",
            "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            disabled && "pointer-events-none opacity-50"
          )}
        >
          {selected.length === 0 ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              {emptyLabel}
            </span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {selected.map((issue) => (
                <Badge
                  key={issue.id}
                  variant="secondary"
                  className="text-[10px] h-5 px-1.5 gap-1 font-normal max-w-[160px] hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                >
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => openIssue(e, issue.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openIssue(e as any, issue.id) }}
                    className="flex items-center gap-1 min-w-0 cursor-pointer hover:text-foreground transition-colors"
                  >
                    <span className="font-mono text-muted-foreground shrink-0">{issue.identifier}</span>
                    <span className="truncate">{issue.title}</span>
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => remove(e, issue.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") remove(e as any, issue.id) }}
                    className="ml-0.5 hover:text-destructive transition-colors cursor-pointer shrink-0"
                  >
                    <X className="h-2.5 w-2.5" />
                  </span>
                </Badge>
              ))}
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search issues..." className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty className="text-xs py-4">No issues found.</CommandEmpty>
            <CommandGroup>
              {available.map((issue) => {
                const isSelected = localValue.includes(issue.id)
                return (
                  <CommandItem
                    key={issue.id}
                    value={`${issue.identifier} ${issue.title}`}
                    onSelect={() => toggle(issue.id)}
                    className="gap-2 py-1.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">
                        <span className="font-mono text-muted-foreground mr-1.5">{issue.identifier}</span>
                        {issue.title}
                      </p>
                    </div>
                    <Check className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "opacity-100 text-indigo-500" : "opacity-0")} />
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
