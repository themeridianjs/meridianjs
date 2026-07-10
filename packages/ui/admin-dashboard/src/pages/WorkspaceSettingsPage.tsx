import React, { useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  useWorkspaceMembers,
  useWorkspaceAccessRequests,
  type WorkspaceMember,
} from "@/api/hooks/useWorkspaces"
import { useAuth } from "@/stores/auth"
import { Button } from "@/components/ui/button"
import { WidgetZone } from "@/components/WidgetZone"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { GeneralTab } from "@/components/workspace-settings/GeneralTab"
import { MembersTab } from "@/components/workspace-settings/MembersTab"
import { TeamsTab } from "@/components/workspace-settings/TeamsTab"
import { AccessRequestsTab } from "@/components/workspace-settings/AccessRequestsTab"
import { InviteMemberDialog } from "@/components/workspace-settings/InviteMemberDialog"

const VALID_TABS = ["general", "members", "teams", "access-requests"] as const
type WorkspaceTab = typeof VALID_TABS[number]

export function WorkspaceSettingsPage() {
  const { workspace: wsRef, user } = useAuth()
  const workspaceId = wsRef?.id ?? ""
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(
    VALID_TABS.includes(tabParam as WorkspaceTab) ? (tabParam as WorkspaceTab) : "general"
  )

  const roles: string[] = user?.roles ?? []
  const isGlobalAdmin = roles.includes("super-admin") || roles.includes("admin")

  // Fetch membership to check workspace-level admin role
  const { data: members = [] } = useWorkspaceMembers(workspaceId)
  const myMembership = members.find((m: WorkspaceMember) => m.user_id === user?.id)
  const isWorkspaceAdmin = isGlobalAdmin || myMembership?.role === "admin"

  const handleTabChange = (tab: WorkspaceTab) => {
    setActiveTab(tab)
    setSearchParams({ tab }, { replace: true })
  }
  const [inviteOpen, setInviteOpen] = useState(false)

  const visibleTabs: WorkspaceTab[] = isWorkspaceAdmin
    ? ["general", "members", "teams", "access-requests"]
    : ["general", "members", "teams"]

  const { data: pendingRequests = [] } = useWorkspaceAccessRequests(workspaceId)
  const pendingCount = isWorkspaceAdmin ? pendingRequests.length : 0

  const tabLabel: Record<WorkspaceTab, React.ReactNode> = {
    general: "General",
    members: "Members",
    teams: "Teams",
    "access-requests": (
      <span className="flex items-center gap-1.5">
        Access Requests
        {pendingCount > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        )}
      </span>
    ),
  }

  return (
    <div className="p-2 pb-24 md:pb-2">
      <WidgetZone zone="workspace.settings.before" props={{ workspaceId }} />
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">

        {/* Tab nav row */}
        <div className="flex items-center justify-between border-b border-border px-2">
          <div className="flex overflow-x-auto scrollbar-none">
            {visibleTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={cn(
                  "h-12 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0",
                  activeTab === tab
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tabLabel[tab]}
              </button>
            ))}
          </div>

          {activeTab === "members" && (
            <Button size="sm" onClick={() => setInviteOpen(true)} className="shrink-0 ml-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add member</span>
            </Button>
          )}
        </div>

        {/* Tab content */}
        {activeTab === "general" && <GeneralTab workspaceId={workspaceId} />}
        {activeTab === "members" && (
          <MembersTab workspaceId={workspaceId} onInvite={() => setInviteOpen(true)} />
        )}
        {activeTab === "teams" && <TeamsTab workspaceId={workspaceId} />}
        {activeTab === "access-requests" && isWorkspaceAdmin && (
          <AccessRequestsTab workspaceId={workspaceId} />
        )}
      </div>

      <WidgetZone zone="workspace.settings.after" props={{ workspaceId }} />

      <InviteMemberDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        workspaceId={workspaceId}
      />
    </div>
  )
}
