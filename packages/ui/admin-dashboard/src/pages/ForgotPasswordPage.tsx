import { useState } from "react"
import { Link } from "react-router-dom"
import { useForgotPassword } from "@/api/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const forgotPassword = useForgotPassword()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    forgotPassword.mutate(
      { email },
      {
        onSuccess: () => setSubmitted(true),
        onError: (err) => toast.error(err.message ?? "Something went wrong"),
      }
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
            <h1 className="text-lg font-semibold text-foreground">
              {submitted ? "Check your email" : "Forgot password?"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {submitted
                ? "If an account exists with that email, we've sent a reset link."
                : "Enter your email and we'll send you a reset link."}
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Didn't receive an email? Check your spam folder or try again.
            </p>
            <Button
              variant="outline"
              className="w-full h-10"
              onClick={() => { setSubmitted(false); setEmail("") }}
            >
              Try again
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="bg-white dark:bg-card h-10"
              autoFocus
            />
            <div className="pt-1">
              <Button
                type="submit"
                className="w-full h-10 font-medium"
                disabled={forgotPassword.isPending}
              >
                {forgotPassword.isPending ? "Sending..." : "Send reset link"}
              </Button>
            </div>
          </form>
        )}

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
