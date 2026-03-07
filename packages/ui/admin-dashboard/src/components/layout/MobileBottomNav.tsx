import { Link, useLocation, useParams } from "react-router-dom"
import { LayoutGrid, Bell, Search, Settings, User } from "lucide-react"
import { useUnreadCount } from "@/api/hooks/useNotifications"
import { useCommandPalette } from "@/stores/command-palette"
import { cn } from "@/lib/utils"

export function MobileBottomNav() {
  const location = useLocation()
  const { workspace } = useParams<{ workspace: string }>()
  const ws = workspace ?? ""
  const { data: unreadCount = 0 } = useUnreadCount()
  const { toggle } = useCommandPalette()

  const items = [
    {
      key: "projects",
      label: "Projects",
      icon: LayoutGrid,
      to: `/${ws}/projects`,
      match: /\/projects($|\/)/,
    },
    {
      key: "notifications",
      label: "Notifications",
      icon: Bell,
      to: `/${ws}/notifications`,
      match: /\/notifications/,
      badge: unreadCount > 0 ? (unreadCount > 9 ? "9+" : String(unreadCount)) : null,
    },
    {
      key: "settings",
      label: "Settings",
      icon: Settings,
      to: `/${ws}/settings`,
      match: /\/settings/,
    },
    {
      key: "profile",
      label: "Profile",
      icon: User,
      to: "/profile",
      match: /^\/profile/,
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden">
      <div className="flex items-stretch h-16 pb-safe">
        {items.map(({ key, label, icon: Icon, to, match, badge }) => {
          const isActive = match.test(location.pathname)
          return (
            <Link
              key={key}
              to={to}
              className={cn(
                "flex flex-col items-center justify-center flex-1 gap-1 text-[10px] font-medium transition-colors relative",
                isActive
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
                {badge && (
                  <span className="absolute -top-1 -right-1.5 h-3.5 w-3.5 rounded-full bg-indigo-600 text-[9px] font-bold text-white flex items-center justify-center leading-none">
                    {badge}
                  </span>
                )}
              </div>
              <span>{label}</span>
            </Link>
          )
        })}

        {/* Search — opens command palette */}
        <button
          onClick={toggle}
          className="flex flex-col items-center justify-center flex-1 gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Search className="h-5 w-5" strokeWidth={1.5} />
          <span>Search</span>
        </button>
      </div>
    </nav>
  )
}
