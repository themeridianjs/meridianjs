import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useRegister, useSetupStatus, useSendRegistrationOtp } from "@/api/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { GoogleSignInButton } from "@/components/ui/GoogleSignInButton"
import { toast } from "sonner"
import { Eye, EyeOff, ArrowLeft } from "lucide-react"
import { AppLogo } from "@/components/AppLogo"
import { getAppName } from "@/lib/branding"

export function RegisterPage() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<"form" | "otp">("form")
  const [otp, setOtp] = useState("")
  const navigate = useNavigate()
  const register = useRegister()
  const sendOtp = useSendRegistrationOtp()
  const { data: setupStatus } = useSetupStatus()
  const isFirstSetup = setupStatus?.needsSetup === true
  const isOpenReg = !isFirstSetup && setupStatus?.registrationEnabled === true

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isOpenReg && step === "form") {
      sendOtp.mutate(
        { email },
        {
          onSuccess: () => setStep("otp"),
          onError: (err) => toast.error(err.message ?? "Failed to send verification code"),
        }
      )
      return
    }

    register.mutate(
      {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        ...(isOpenReg ? { otp } : {}),
      },
      {
        onSuccess: () => navigate("/"),
        onError: (err) => toast.error(err.message ?? "Registration failed"),
      }
    )
  }

  const handleResendOtp = () => {
    sendOtp.mutate(
      { email },
      {
        onSuccess: () => toast.success("A new code has been sent"),
        onError: (err) => toast.error(err.message ?? "Failed to resend code"),
      }
    )
  }

  return (
    <div className="min-h-screen bg-[hsl(60_5%_96%)] dark:bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[360px]">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <AppLogo />
          <div className="text-center">
            <h1 className="text-lg font-semibold text-foreground">
              {isFirstSetup ? "Set up your account" : "Create your account"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isFirstSetup
                ? "You're the first user — you'll be the super admin."
                : step === "otp"
                ? `We sent a code to ${email}`
                : `Get started with ${getAppName()}`}
            </p>
          </div>
        </div>

        {step === "otp" ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button
              className="w-full h-10 font-medium"
              disabled={otp.length < 6 || register.isPending}
              onClick={handleSubmit as any}
            >
              {register.isPending ? "Creating account..." : "Verify & Create Account"}
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => { setStep("form"); setOtp("") }}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={sendOtp.isPending}
                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {sendOtp.isPending ? "Sending..." : "Resend code"}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="bg-white dark:bg-card h-10"
                />
                <Input
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="bg-white dark:bg-card h-10"
                />
              </div>
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
                  autoComplete="new-password"
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
              <div className="pt-1">
                <Button
                  type="submit"
                  className="w-full h-10 font-medium"
                  disabled={register.isPending || sendOtp.isPending}
                >
                  {sendOtp.isPending
                    ? "Sending code..."
                    : register.isPending
                    ? "Creating account..."
                    : isOpenReg
                    ? "Continue"
                    : "Create Account"}
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
                <GoogleSignInButton
                  flow="register"
                  label={isFirstSetup ? "Set up with Google" : "Continue with Google"}
                />
              </div>
            )}

            <p className="text-sm text-center text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-indigo hover:opacity-80 transition-opacity">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
