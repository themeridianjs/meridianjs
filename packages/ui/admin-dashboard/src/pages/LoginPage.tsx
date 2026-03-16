import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useLogin, useSetupStatus } from "@/api/hooks/useAuth"
import { WidgetZone } from "@/components/WidgetZone"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GoogleSignInButton } from "@/components/ui/GoogleSignInButton"
import { toast } from "sonner"
import { Eye, EyeOff } from "lucide-react"
import { AppLogo } from "@/components/AppLogo"
import { getAppName } from "@/lib/branding"

export function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const login = useLogin()
  const { data: setupStatus } = useSetupStatus()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login.mutate(
      { email, password },
      {
        onSuccess: () => navigate("/"),
        onError: (err) => toast.error(err.message ?? "Invalid email or password"),
      }
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[360px]">
        <WidgetZone zone="login.before" props={{}} />
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <AppLogo />
          <div className="text-center">
            <h1 className="text-lg font-semibold text-foreground">Welcome to {getAppName()}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Sign in to access the admin area</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="bg-white dark:bg-card h-10"
          />
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="bg-white dark:bg-card h-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Forgot password?
            </Link>
          </div>
          <div className="pt-1">
            <Button
              type="submit"
              className="w-full h-10 font-medium"
              disabled={login.isPending}
            >
              {login.isPending ? "Signing in..." : "Continue with Email"}
            </Button>
          </div>
        </form>

        {setupStatus?.googleOAuthEnabled && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <GoogleSignInButton flow="login" />
          </div>
        )}

        {(setupStatus?.needsSetup || setupStatus?.registrationEnabled) && (
          <p className="text-sm text-center text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-indigo hover:opacity-80 transition-opacity">
              Create one
            </Link>
          </p>
        )}
        <WidgetZone zone="login.after" props={{}} />
      </div>
    </div>
  )
}
