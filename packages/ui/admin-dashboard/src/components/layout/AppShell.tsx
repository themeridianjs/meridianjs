import { useEffect } from "react"
import { Outlet } from "react-router-dom"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "./Sidebar"
import { Header } from "./Header"
import { MobileBottomNav } from "./MobileBottomNav"
import { useAuth } from "@/stores/auth"

/** Fetch fresh user profile on mount and sync avatar_url + workspace logo_url into local state. */
function useEnsureUserProfile() {
  const { user, token, updateLocalUser, workspace, setWorkspace } = useAuth()
  useEffect(() => {
    if (!user || !token || !user.email) return
    fetch("/admin/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((profile) => {
        if (profile) {
          updateLocalUser({ avatar_url: profile.avatar_url ?? null })
        }
      })
      .catch(() => {})
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync workspace logo_url from server if missing (e.g. after fresh login)
  useEffect(() => {
    if (!workspace || workspace.logo_url !== undefined) return
    if (!token) return
    fetch("/admin/workspaces", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const found = data?.workspaces?.find((w: any) => w.id === workspace.id)
        if (found) {
          setWorkspace({ ...workspace, logo_url: found.logo_url ?? null })
        }
      })
      .catch(() => {})
  }, [workspace?.id]) // eslint-disable-line react-hooks/exhaustive-deps
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
