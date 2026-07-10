import type { ProjectStatus } from "@/api/hooks/useProjectStatuses"
import type { Sprint } from "@/api/hooks/useSprints"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ISSUE_PRIORITY_LABELS } from "@/lib/constants"
import { Search } from "lucide-react"

interface IssuesFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  priorityFilter: string
  onPriorityFilterChange: (value: string) => void
  sprintFilter: string
  onSprintFilterChange: (value: string) => void
  statuses: ProjectStatus[]
  sprints: Sprint[]
}

export function IssuesFilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  sprintFilter,
  onSprintFilterChange,
  statuses,
  sprints,
}: IssuesFilterBarProps) {
  return (
    <div className="flex flex-col gap-2 px-4 md:px-6 py-3 border-b border-border md:flex-row md:items-center md:justify-between md:gap-3">
      <div className="flex items-center gap-2 md:overflow-x-auto md:scrollbar-none">
        <Select value={sprintFilter} onValueChange={onSprintFilterChange}>
          <SelectTrigger className="h-8 text-xs flex-1 md:flex-none md:w-[140px] md:shrink-0 bg-transparent">
            <SelectValue placeholder="Sprint" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All sprints</SelectItem>
            <SelectItem value="none" className="text-xs text-muted-foreground">No sprint</SelectItem>
            {sprints.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="h-8 text-xs flex-1 md:flex-none md:w-[130px] md:shrink-0 bg-transparent">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All statuses</SelectItem>
            {statuses.map(({ key, name }) => (
              <SelectItem key={key} value={key} className="text-xs">{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={onPriorityFilterChange}>
          <SelectTrigger className="h-8 text-xs flex-1 md:flex-none md:w-[130px] md:shrink-0 bg-transparent">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All priorities</SelectItem>
            {Object.entries(ISSUE_PRIORITY_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-8 w-full md:w-[200px] text-xs bg-transparent"
        />
      </div>
    </div>
  )
}
