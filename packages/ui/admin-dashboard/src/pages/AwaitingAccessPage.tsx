import { useAuth } from "@/stores/auth"
import { Button } from "@/components/ui/button"

export function AwaitingAccessPage() {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen bg-[hsl(60_5%_96%)] dark:bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="relative h-16 w-16 rounded-2xl bg-white dark:bg-card border border-border shadow-sm flex items-center justify-center">
            <div className="h-10 w-10 rounded-full bg-foreground flex items-center justify-center">
              <div className="h-5 w-5 rounded-full bg-background/20 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-background/60" />
              </div>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-foreground">Waiting for access</h1>
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
