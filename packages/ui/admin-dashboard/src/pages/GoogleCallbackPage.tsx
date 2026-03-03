import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/stores/auth"
import { Button } from "@/components/ui/button"

export function GoogleCallbackPage() {
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const auth = useAuth()

  useEffect(() => {
    // Read from query params — the backend uses ?code= (one-time exchange code)
    // and ?error= (error message). Clear the URL immediately so the code/error
    // never lingers in browser history or Referer headers.
    const params = new URLSearchParams(window.location.search)
    history.replaceState(null, "", window.location.pathname)

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
      const exchangeRes = await fetch("/auth/google/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })

      if (!exchangeRes.ok) {
        throw new Error(`Code exchange failed (${exchangeRes.status}). Please try signing in again.`)
      }

      const { token } = await exchangeRes.json() as { token: string }

      // Fetch user profile using the JWT
      const profileRes = await fetch("/admin/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!profileRes.ok) {
        throw new Error(`Failed to load user profile (${profileRes.status})`)
      }

      const profile = await profileRes.json() as {
        id: string; email: string; first_name: string | null; last_name: string | null
      }

      // Single auth.login() call with real data — no intermediate empty state
      auth.login(
        { id: profile.id, email: profile.email, first_name: profile.first_name ?? "", last_name: profile.last_name ?? "" },
        token
      )

      navigate("/", { replace: true })
    }

    finish().catch((err) => setError(err.message ?? "Failed to complete sign-in"))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) {
    return (
      <div className="min-h-screen bg-[hsl(60_5%_96%)] dark:bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-[360px] bg-white dark:bg-card border border-border rounded-xl p-6 text-center space-y-4">
          <p className="text-sm font-medium">Sign-in failed</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Link to="/login">
            <Button variant="outline" size="sm">Back to login</Button>
          </Link>
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
