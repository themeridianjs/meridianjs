import { useAuth } from "@/stores/auth"
import { Button } from "@/components/ui/button"
import { AppLogo } from "@/components/AppLogo"
import { getAppName } from "@/lib/branding"

export function AwaitingAccessPage() {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen bg-[hsl(60_5%_96%)] dark:bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <AppLogo />
          <div className="text-center">
            <h1 className="text-lg font-semibold text-foreground">Waiting for {getAppName()} access</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              You've been added to the system, but haven't been assigned to a workspace yet. An admin will add you shortly.
            </p>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={logout}>
          Sign out
        </Button>
      </div>
    </div>
  )
}
