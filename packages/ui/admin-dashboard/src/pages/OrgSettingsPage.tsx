import { useSearchParams } from "react-router-dom"
import { CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"
import { WorkingDaysTab } from "@/components/org-settings/WorkingDaysTab"
import { HolidaysTab } from "@/components/org-settings/HolidaysTab"
import { MembersTab } from "@/components/org-settings/MembersTab"

type Tab = "working-days" | "holidays" | "members"

const VALID_TABS: Tab[] = ["working-days", "holidays", "members"]

export function OrgSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get("tab") as Tab | null
  const tab: Tab = rawTab && VALID_TABS.includes(rawTab) ? rawTab : "working-days"

  const setTab = (id: Tab) => setSearchParams({ tab: id }, { replace: true })

  const tabs: { id: Tab; label: string }[] = [
    { id: "working-days", label: "Working Days" },
    { id: "holidays", label: "Holidays" },
    { id: "members", label: "Members" },
  ]

  return (
    <div className="p-2 md:pb-2 h-full">
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden flex flex-col h-full">

        {/* Page header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <div>
              <h1 className="text-base font-semibold">Organization Settings</h1>
              <p className="text-xs text-muted-foreground">
                Global configuration that applies across the entire Meridian deployment.
              </p>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border shrink-0 px-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-1 py-3 mr-6 text-sm font-medium border-b-2 transition-colors",
                tab === t.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable tab content */}
        <div className="flex-1 overflow-y-auto">
          {tab === "working-days" && <WorkingDaysTab />}
          {tab === "holidays" && <HolidaysTab />}
          {tab === "members" && <MembersTab />}
        </div>

      </div>
    </div>
  )
}
