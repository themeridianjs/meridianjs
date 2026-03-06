import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ChevronDown, X, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BoardFilters } from "@/api/hooks/useIssues"
import type { ProjectStatus } from "@/api/hooks/useProjectStatuses"

interface MemberOption {
  userId: string
  name: string
  initials: string
}

interface BoardFilterBarProps {
  statuses: ProjectStatus[]
  members: MemberOption[]
  filters: BoardFilters
  onChange: (filters: BoardFilters) => void
}

const PRIORITIES = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "none", label: "None" },
]

const TYPES = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature" },
  { value: "task", label: "Task" },
  { value: "epic", label: "Epic" },
  { value: "story", label: "Story" },
]

function FilterButton({
  label,
  activeCount,
  children,
}: {
  label: string
  activeCount: number
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-xs font-medium transition-colors",
            activeCount > 0
              ? "border-foreground/30 bg-foreground/5 text-foreground"
              : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {label}
          {activeCount > 0 && (
            <span className="flex items-center justify-center h-4 w-4 rounded-full bg-foreground text-background text-[10px] font-semibold">
              {activeCount}
            </span>
          )}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start">
        {children}
      </PopoverContent>
    </Popover>
  )
}

function MultiSelectList({
  options,
  selected,
  onToggle,
}: {
  options: { value: string; label: string; color?: string }[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {options.map((opt) => {
        const isSelected = selected.includes(opt.value)
        return (
          <button
            key={opt.value}
            onClick={() => onToggle(opt.value)}
            className="flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted w-full text-left"
          >
            <div className={cn("h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0",
              isSelected ? "bg-foreground border-foreground" : "border-border"
            )}>
              {isSelected && <Check className="h-2.5 w-2.5 text-background" />}
            </div>
            {opt.color && (
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
            )}
            <span className="truncate">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function BoardFilterBar({ statuses, members, filters, onChange }: BoardFilterBarProps) {
  const hasAny =
    (filters.priority?.length ?? 0) > 0 ||
    !!filters.assignee_id ||
    (filters.type?.length ?? 0) > 0 ||
    (filters.status?.length ?? 0) > 0

  const toggleMulti = (field: "priority" | "type" | "status", value: string) => {
    const current = (filters[field] as string[] | undefined) ?? []
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    onChange({ ...filters, [field]: next.length ? next : undefined })
  }

  const setAssignee = (userId: string) => {
    onChange({ ...filters, assignee_id: filters.assignee_id === userId ? undefined : userId })
  }

  const assigneeName = filters.assignee_id
    ? members.find((m) => m.userId === filters.assignee_id)?.name ?? "Assignee"
    : "Assignee"

  return (
    <div className="flex items-center gap-2">
      {/* Assignee */}
      <FilterButton label={filters.assignee_id ? assigneeName : "Assignee"} activeCount={filters.assignee_id ? 1 : 0}>
        <div className="flex flex-col gap-0.5">
          {members.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-1.5">No members</p>
          )}
          {members.map((m) => {
            const isSelected = filters.assignee_id === m.userId
            return (
              <button
                key={m.userId}
                onClick={() => setAssignee(m.userId)}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted w-full text-left"
              >
                <div className={cn("h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0",
                  isSelected ? "bg-foreground border-foreground" : "border-border"
                )}>
                  {isSelected && <Check className="h-2.5 w-2.5 text-background" />}
                </div>
                <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium shrink-0">
                  {m.initials}
                </span>
                <span className="truncate">{m.name}</span>
              </button>
            )
          })}
        </div>
      </FilterButton>

      {/* Priority */}
      <FilterButton label="Priority" activeCount={filters.priority?.length ?? 0}>
        <MultiSelectList
          options={PRIORITIES}
          selected={filters.priority ?? []}
          onToggle={(v) => toggleMulti("priority", v)}
        />
      </FilterButton>

      {/* Type */}
      <FilterButton label="Type" activeCount={filters.type?.length ?? 0}>
        <MultiSelectList
          options={TYPES}
          selected={filters.type ?? []}
          onToggle={(v) => toggleMulti("type", v)}
        />
      </FilterButton>

      {/* Status */}
      <FilterButton label="Status" activeCount={filters.status?.length ?? 0}>
        <MultiSelectList
          options={statuses.map((s) => ({ value: s.key, label: s.name, color: s.color }))}
          selected={filters.status ?? []}
          onToggle={(v) => toggleMulti("status", v)}
        />
      </FilterButton>

      {/* Clear */}
      {hasAny && (
        <button
          onClick={() => onChange({})}
          className="inline-flex items-center gap-1 h-7 px-2 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-3 w-3" />
          Clear
        </button>
      )}
    </div>
  )
}
