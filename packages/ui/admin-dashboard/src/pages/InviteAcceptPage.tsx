import { useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/api/client"
import { useRegisterViaInvite } from "@/api/hooks/useAuth"
import { useAuth } from "@/stores/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ShieldCheck, UserRound, Building2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

interface InviteDetails {
  invitation: { id: string; role: "admin" | "member"; email: string | null; status: string }
  workspace: { id: string; name: string; slug: string }
}

function useInviteDetails(token: string) {
  return useQuery({
    queryKey: ["invite", token],
    queryFn: () => api.get<InviteDetails>(`/auth/invite/${token}`),
    retry: false,
    enabled: !!token,
  })
}

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const { data, isLoading, error } = useInviteDetails(token ?? "")
  const register = useRegisterViaInvite(token ?? "")

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // If already authenticated, go straight to the invited workspace
  if (isAuthenticated && data) {
    navigate(`/${data.workspace.slug}/projects`, { replace: true })
    return null
  }

  const lockedEmail = data?.invitation.email ?? null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const submittedEmail = lockedEmail ?? email.trim()
    if (!submittedEmail) {
      toast.error("Email is required")
      return
    }
    register.mutate(
      { email: submittedEmail, password, first_name: firstName, last_name: lastName },
      {
        onSuccess: () => {
          // auth context is now populated via useRegisterViaInvite's onSuccess
          navigate(`/${data!.workspace.slug}/projects`, { replace: true })
        },
        onError: (err) => toast.error((err as any).message ?? "Registration failed"),
      }
    )
  }

  return (
    <div className="min-h-screen bg-[hsl(60_5%_96%)] dark:bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[380px]">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="relative h-16 w-16 rounded-2xl bg-white dark:bg-card border border-border shadow-sm flex items-center justify-center">
            <div className="h-10 w-10 rounded-full bg-foreground flex items-center justify-center">
              <div className="h-5 w-5 rounded-full bg-background/20 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-background/60" />
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <div className="h-2 bg-muted rounded animate-pulse w-48 mx-auto" />
            <div className="h-2 bg-muted rounded animate-pulse w-32 mx-auto" />
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-card border border-border rounded-xl p-6 text-center space-y-3">
            <p className="text-sm font-medium">Invalid or expired invitation</p>
            <p className="text-sm text-muted-foreground">
              This invite link is no longer valid. Ask for a new one.
            </p>
            <Link to="/login">
              <Button variant="outline" size="sm" className="mt-2">Go to login</Button>
            </Link>
          </div>
        ) : data ? (
          <div className="space-y-4">

            {/* Workspace + role card */}
            <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">You've been invited to</span>
                </div>
                <p className="text-base font-semibold">{data.workspace.name}</p>
              </div>
              <div className="px-5 py-3 flex items-center gap-2.5">
                {data.invitation.role === "admin"
                  ? <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  : <UserRound className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                <span className="text-xs text-muted-foreground">
                  Joining as{" "}
                  <span className="font-medium text-foreground capitalize">{data.invitation.role}</span>
                  {data.invitation.role === "admin"
                    ? " — full access"
                    : " — can view and edit"}
                </span>
              </div>
            </div>

            {/* Registration form */}
            <div className="bg-white dark:bg-card border border-border rounded-xl px-5 py-5">
              <p className="text-sm font-medium mb-4">Create your account</p>
              <form onSubmit={handleSubmit} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="h-9 bg-transparent"
                    autoFocus
                  />
                  <Input
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="h-9 bg-transparent"
                  />
                </div>

                {lockedEmail ? (
                  /* Email locked to the invite */
                  <div className="relative">
                    <Input
                      type="email"
                      value={lockedEmail}
                      readOnly
                      className="h-9 bg-muted/50 text-muted-foreground cursor-not-allowed"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      locked
                    </span>
                  </div>
                ) : (
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-9 bg-transparent"
                    autoComplete="email"
                  />
                )}

                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password (min. 8 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="h-9 bg-transparent pr-10"
                    autoComplete="new-password"
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

                <div className="pt-1">
                  <Button
                    type="submit"
                    className="w-full h-9 font-medium"
                    disabled={register.isPending}
                  >
                    {register.isPending ? "Creating account…" : "Accept invitation"}
                  </Button>
                </div>
              </form>
            </div>

            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-indigo hover:opacity-80 transition-opacity">
                Sign in
              </Link>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
