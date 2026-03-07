import { useEffect } from "react"
import { Outlet } from "react-router-dom"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "./Sidebar"
import { Header } from "./Header"
import { MobileBottomNav } from "./MobileBottomNav"
import { useAuth } from "@/stores/auth"

/** If the auth store has a valid token but missing user profile data (e.g. stale
 *  localStorage from a previous Google OAuth session), re-fetch from the server. */
function useEnsureUserProfile() {
  const { user, token, login } = useAuth()
  useEffect(() => {
    if (!user || !token || !user.email) return
    fetch("/admin/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((profile) => {
        if (profile) {
          login(
            { id: profile.id, email: profile.email, first_name: profile.first_name ?? "", last_name: profile.last_name ?? "", avatar_url: profile.avatar_url ?? null },
            token
          )
        }
      })
      .catch(() => {})
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps
}

export function AppShell() {
  useEnsureUserProfile()
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset className="flex flex-col min-w-0">
        <Header />
        <div className="flex flex-1 flex-col min-h-0 overflow-y-auto overflow-x-hidden pb-16 md:pb-0">
          <Outlet />
        </div>
      </SidebarInset>
      <MobileBottomNav />
    </SidebarProvider>
  )
}
