import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/stores/auth"
import { Button } from "@/components/ui/button"
import { BASE_URL } from "@/api/client"

// Read query params once at module level before any React render cycle can clear them.
// This guards against React 18 StrictMode double-effect execution.
const initialParams = new URLSearchParams(window.location.search)

export function GoogleCallbackPage() {
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const auth = useAuth()
  const didRun = useRef(false)

  useEffect(() => {
    if (didRun.current) return
    didRun.current = true

    const params = initialParams
    history.replaceState(null, "", window.location.pathname)

    // Link flow: backend redirects here with ?linked=true after attaching Google account
    const linked = params.get("linked")
    if (linked === "true") {
      navigate("/profile?linked=true", { replace: true })
      return
    }

    const errorMsg = params.get("error")
    if (errorMsg) {
      setError(decodeURIComponent(errorMsg))
      return
    }

    const code = params.get("code")
    if (!code) {
      setError("No authorization code received from Google sign-in")
      return
    }

    const finish = async () => {
      // Exchange the one-time code for the real JWT
      const exchangeRes = await fetch(`${BASE_URL}/auth/google/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })

      if (!exchangeRes.ok) {
        throw new Error(`Code exchange failed (${exchangeRes.status}). Please try signing in again.`)
      }

      const { token } = await exchangeRes.json() as { token: string }

      // Fetch user profile using the JWT
      const profileRes = await fetch(`${BASE_URL}/admin/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!profileRes.ok) {
        throw new Error(`Failed to load user profile (${profileRes.status})`)
      }

      const profile = await profileRes.json() as {
        id: string; email: string; first_name: string | null; last_name: string | null; avatar_url: string | null
      }

      // Single auth.login() call with real data — no intermediate empty state
      auth.login(
        { id: profile.id, email: profile.email, first_name: profile.first_name ?? "", last_name: profile.last_name ?? "", avatar_url: profile.avatar_url },
        token
      )

      navigate("/", { replace: true })
    }

    finish().catch((err) => setError(err.message ?? "Failed to complete sign-in"))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) {
    const isNotLinked = error.startsWith("GOOGLE_NOT_LINKED:")
    const displayMessage = isNotLinked
      ? error.replace("GOOGLE_NOT_LINKED: ", "")
      : error

    return (
      <div className="min-h-screen bg-[hsl(60_5%_96%)] dark:bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-[400px] bg-white dark:bg-card border border-border rounded-xl p-6 text-center space-y-4">
          <p className="text-sm font-medium">{isNotLinked ? "Google account not connected" : "Sign-in failed"}</p>
          <p className="text-sm text-muted-foreground">{displayMessage}</p>
          {isNotLinked ? (
            <div className="flex flex-col gap-2 pt-1">
              <Link to="/login">
                <Button className="w-full" size="sm">Sign in with email & password</Button>
              </Link>
              <p className="text-xs text-muted-foreground">
                After signing in, go to <strong>Profile</strong> &rarr; <strong>Connections</strong> to link your Google account.
              </p>
            </div>
          ) : (
            <Link to="/login">
              <Button variant="outline" size="sm">Back to login</Button>
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <span className="text-sm text-muted-foreground">Completing sign-in...</span>
    </div>
  )
}
