import { useState } from "react"
import { Link, useSearchParams, useNavigate } from "react-router-dom"
import { useResetPassword } from "@/api/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Eye, EyeOff, ArrowLeft } from "lucide-react"

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const navigate = useNavigate()
  const resetPassword = useResetPassword()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    resetPassword.mutate(
      { token, password },
      {
        onSuccess: () => {
          toast.success("Password has been reset. Please sign in.")
          navigate("/login", { replace: true })
        },
        onError: (err) => toast.error(err.message ?? "Failed to reset password"),
      }
    )
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[hsl(60_5%_96%)] dark:bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-[360px] text-center space-y-4">
          <p className="text-sm font-medium">Invalid reset link</p>
          <p className="text-sm text-muted-foreground">This link is missing or expired.</p>
          <Link to="/forgot-password">
            <Button variant="outline" size="sm">Request a new link</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[hsl(60_5%_96%)] dark:bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[360px]">
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
            <h1 className="text-lg font-semibold text-foreground">Set new password</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Enter your new password below.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="bg-white dark:bg-card h-10 pr-10"
              autoFocus
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
          <Input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            className="bg-white dark:bg-card h-10"
          />
          <div className="pt-1">
            <Button
              type="submit"
              className="w-full h-10 font-medium"
              disabled={resetPassword.isPending}
            >
              {resetPassword.isPending ? "Resetting..." : "Reset password"}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
