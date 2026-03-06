import { useParams } from "react-router-dom"
import { format } from "date-fns"
import {
  Globe, Link2Off, Pencil, Plus, Activity,
  UserPlus, UserMinus, Users, UserX, Tag, Trash2,
} from "lucide-react"
import { useProjectByKey, useProjectActivities } from "@/api/hooks/useProjects"
import { useUserMap } from "@/api/hooks/useUsers"
import { useTeams } from "@/api/hooks/useWorkspaces"
import { useAuth } from "@/stores/auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { ProjectActivity } from "@/api/hooks/useProjects"

// ── Action config ─────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, {
  icon: React.ElementType
  color: string
  bg: string
  label: (changes: ProjectActivity["changes"], userMap: Map<string, { name: string }>, teamMap: Map<string, string>) => string
}> = {
  share_enabled: {
    icon: Globe,
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-950/40",
    label: () => "Enabled public link",
  },
  share_revoked: {
    icon: Link2Off,
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950/40",
    label: () => "Revoked public link",
  },
  member_added: {
    icon: UserPlus,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    label: (changes, userMap) => {
      const userId = (changes as any)?.user_id?.to as string | undefined
      const role = (changes as any)?.role?.to as string | undefined
      const name = userId ? (userMap.get(userId)?.name ?? userId) : "a user"
      return role ? `Added ${name} as ${role}` : `Added ${name}`
    },
  },
  member_removed: {
    icon: UserMinus,
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950/40",
    label: (changes, userMap) => {
      const userId = (changes as any)?.user_id?.from as string | undefined
      const name = userId ? (userMap.get(userId)?.name ?? userId) : "a user"
      return `Removed ${name}`
    },
  },
  team_added: {
    icon: Users,
    color: "text-indigo-500",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    label: (changes, _userMap, teamMap) => {
      const teamId = (changes as any)?.team_id?.to as string | undefined
      const name = teamId ? (teamMap.get(teamId) ?? teamId) : "a team"
      return `Added team ${name}`
    },
  },
  team_removed: {
    icon: UserX,
    color: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    label: (changes, _userMap, teamMap) => {
      const teamId = (changes as any)?.team_id?.from as string | undefined
      const name = teamId ? (teamMap.get(teamId) ?? teamId) : "a team"
      return `Removed team ${name}`
    },
  },
  status_updated: {
    icon: Tag,
    color: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    label: (changes) => {
      const from = (changes as any)?.name?.from as string | undefined
      const to = (changes as any)?.name?.to as string | undefined
      if (from && to) return `Renamed status "${from}" to "${to}"`
      return "Updated status"
    },
  },
  status_deleted: {
    icon: Trash2,
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950/40",
    label: (changes) => {
      const name = (changes as any)?.name?.from as string | undefined
      return name ? `Deleted status "${name}"` : "Deleted status"
    },
  },
  updated: {
    icon: Pencil,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    label: () => "Updated project",
  },
  created: {
    icon: Plus,
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    label: () => "Created project",
  },
}

const FALLBACK_CONFIG = {
  icon: Activity,
  color: "text-zinc-500",
  bg: "bg-zinc-100 dark:bg-zinc-800",
  label: () => "Activity",
}

// ── Single row ────────────────────────────────────────────────────────────────

interface ActivityRowProps {
  activity: ProjectActivity
  userMap: Map<string, { name: string; initials: string }>
  teamMap: Map<string, string>
}

function ActivityRow({ activity, userMap, teamMap }: ActivityRowProps) {
  const cfg = ACTION_CONFIG[activity.action] ?? FALLBACK_CONFIG
  const Icon = cfg.icon
  const actor = userMap.get(activity.actor_id)
  const actorName = actor?.name ?? "System"
  const actorInitials = actor?.initials ?? "S"
  const label = cfg.label(activity.changes, userMap, teamMap)

  // Extra detail line (share URL for share_enabled)
  const detail = (() => {
    if (activity.action === "share_enabled") {
      const url = (activity.changes as any)?.share_url?.to as string | undefined
      return url ? (
        <span className="text-xs text-muted-foreground/60 font-mono break-all">{url}</span>
      ) : null
    }
    return null
  })()

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
      {/* Action icon */}
      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", cfg.bg)}>
        <Icon className={cn("h-4 w-4", cfg.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Avatar className="h-5 w-5 shrink-0">
            <AvatarFallback className="text-[10px] font-medium">{actorInitials}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate">{actorName}</span>
          <span className="text-xs text-muted-foreground shrink-0">{label}</span>
        </div>
        {detail && (
          <div className="mt-0.5 pl-7">
            {detail}
          </div>
        )}
      </div>

      {/* Timestamp */}
      <time className="text-xs text-muted-foreground shrink-0">
        {format(new Date(activity.created_at), "MMM d, yyyy · h:mm a")}
      </time>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ProjectActivityPage() {
  const { projectKey } = useParams<{ projectKey: string }>()
  const { workspace } = useAuth()
  const { data: project } = useProjectByKey(projectKey ?? "")
  const { data: activities, isLoading } = useProjectActivities(project?.id ?? "")
  const { data: userMap = new Map() } = useUserMap()
  const { data: teams = [] } = useTeams(workspace?.id ?? "")

  // Build a teamId → name map for display
  const teamMap = new Map(teams.map((t) => [t.id, t.name]))

  const count = activities?.length ?? 0

  return (
    <div className="p-2">
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">Activity</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              A log of share access changes, member updates, and project edits.
            </p>
          </div>
          {!isLoading && count > 0 && (
            <p className="text-xs text-muted-foreground shrink-0">
              {count} event{count !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Section label */}
        <div className="px-6 py-2 border-b border-border bg-muted/20">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Log
          </span>
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-3 w-32 shrink-0" />
              </div>
            ))}
          </div>
        ) : !activities || activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Activity className="h-8 w-8 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Actions like sharing the project or adding members will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {activities.map((activity) => (
              <ActivityRow key={activity.id} activity={activity} userMap={userMap} teamMap={teamMap} />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
