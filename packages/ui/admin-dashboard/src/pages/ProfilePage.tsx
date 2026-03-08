import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useMe, useUpdateProfile, useUploadAvatar, useRemoveAvatar, useUnlinkGoogle, useSendPasswordOtp, useSetPassword } from "@/api/hooks/useProfile"
import { useAuth } from "@/stores/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Camera, Trash2, User, CheckCircle2, XCircle, Eye, EyeOff, KeyRound } from "lucide-react"
import { BASE_URL } from "@/api/client"

// ── Google icon ───────────────────────────────────────────────────────────────

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "size-4"} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

// ── Profile page ──────────────────────────────────────────────────────────────

export function ProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const { data: profile, isLoading } = useMe()

  const updateProfile = useUpdateProfile()
  const uploadAvatar  = useUploadAvatar()
  const removeAvatar  = useRemoveAvatar()
  const unlinkGoogle   = useUnlinkGoogle()
  const sendOtp        = useSendPasswordOtp()
  const setPassword    = useSetPassword()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [firstName,   setFirstName]   = useState("")
  const [lastName,    setLastName]    = useState("")
  const [designation, setDesignation] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")

  // Password dialog state
  const [pwDialogOpen,    setPwDialogOpen]    = useState(false)
  const [otpSent,         setOtpSent]         = useState(false)
  const [otpCode,         setOtpCode]         = useState("")
  const [newPassword,     setNewPassword]     = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPw,       setShowNewPw]       = useState(false)
  const [resendTimer,     setResendTimer]     = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? "")
      setLastName(profile.last_name ?? "")
      setDesignation(profile.designation ?? "")
      setPhoneNumber(profile.phone_number ?? "")
    }
  }, [profile])

  // Handle ?linked=true redirect from Google OAuth link flow
  useEffect(() => {
    if (searchParams.get("linked") === "true") {
      toast.success("Google account connected successfully")
      setSearchParams((p) => { p.delete("linked"); return p }, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const initials = user
    ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"
    : "?"

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    uploadAvatar.mutate(file, {
      onSuccess: () => toast.success("Avatar updated"),
      onError: (err: any) => toast.error(err.message ?? "Failed to upload avatar"),
    })
    e.target.value = ""
  }

  const handleRemoveAvatar = () => {
    removeAvatar.mutate(undefined, {
      onSuccess: () => toast.success("Avatar removed"),
      onError: (err: any) => toast.error(err.message ?? "Failed to remove avatar"),
    })
  }

  const handleSave = () => {
    updateProfile.mutate(
      {
        first_name:   firstName,
        last_name:    lastName,
        designation:  designation || null,
        phone_number: phoneNumber || null,
      },
      {
        onSuccess: () => toast.success("Profile updated"),
        onError: (err: any) => toast.error(err.message ?? "Failed to update profile"),
      }
    )
  }

  const handleConnectGoogle = () => {
    const token = localStorage.getItem("meridian_token")
    if (!token) {
      toast.error("You must be logged in to connect Google")
      return
    }
    // Full-page navigation so the server's Set-Cookie (nonce) is stored correctly.
    // Cross-origin XHR silently drops Set-Cookie, causing CSRF failures.
    window.location.href = `${BASE_URL}/auth/google/link?token=${encodeURIComponent(token)}`
  }

  const handleUnlinkGoogle = () => {
    unlinkGoogle.mutate(undefined, {
      onSuccess: () => toast.success("Google account disconnected"),
      onError: (err: any) => toast.error(err.message ?? "Failed to unlink Google account"),
    })
  }

  const startResendTimer = useCallback(() => {
    setResendTimer(30)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const handleSendOtp = () => {
    sendOtp.mutate(undefined, {
      onSuccess: () => {
        setOtpSent(true)
        startResendTimer()
        toast.success("Verification code sent to your email")
      },
      onError: (err: any) => toast.error(err.message ?? "Failed to send verification code"),
    })
  }

  const handleSetPassword = () => {
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    setPassword.mutate(
      { otp: otpCode, new_password: newPassword },
      {
        onSuccess: () => {
          toast.success("Password updated")
          resetPasswordDialog()
        },
        onError: (err: any) => toast.error(err.message ?? "Failed to set password"),
      }
    )
  }

  const resetPasswordDialog = () => {
    setPwDialogOpen(false)
    setOtpSent(false)
    setOtpCode("")
    setNewPassword("")
    setConfirmPassword("")
    setShowNewPw(false)
    setResendTimer(0)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  return (
    <div className="p-2 md:h-full">
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden flex flex-col md:h-full">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <h1 className="text-base font-semibold">Profile</h1>
              <p className="text-xs text-muted-foreground">
                Manage your personal details and account connections.
              </p>
            </div>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Avatar section ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between px-4 md:px-6 py-4 border-b border-border gap-3">
            <span className="text-sm text-muted-foreground shrink-0">Profile photo</span>
            <div className="flex flex-1 items-center gap-4">
              <div className="relative">
                <Avatar className="h-14 w-14 rounded-xl">
                  {profile?.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt="Avatar" className="object-cover" />
                  ) : null}
                  <AvatarFallback className="rounded-xl bg-foreground text-background text-base font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {uploadAvatar.isPending && (
                  <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center">
                    <span className="text-white text-[10px]">…</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadAvatar.isPending}
                >
                  <Camera className="size-3.5" />
                  Change photo
                </Button>
                {profile?.avatar_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-muted-foreground hover:text-destructive"
                    onClick={handleRemoveAvatar}
                    disabled={removeAvatar.isPending}
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
          </div>

          {/* ── Personal info rows ── */}

          {/* Section label */}
          <div className="px-6 py-2 border-b border-border bg-muted/10">
            <p className="text-xs text-muted-foreground">Personal information</p>
          </div>

          {/* First name */}
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] items-start md:items-center gap-1 md:gap-4 px-4 md:px-6 py-3.5 border-b border-border">
            <span className="text-sm text-muted-foreground">First name</span>
            {isLoading ? (
              <Skeleton className="h-8 w-56" />
            ) : (
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-8 w-full max-w-64 text-sm bg-transparent"
                placeholder="First name"
              />
            )}
          </div>

          {/* Last name */}
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] items-start md:items-center gap-1 md:gap-4 px-4 md:px-6 py-3.5 border-b border-border">
            <span className="text-sm text-muted-foreground">Last name</span>
            {isLoading ? (
              <Skeleton className="h-8 w-56" />
            ) : (
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-8 w-full max-w-64 text-sm bg-transparent"
                placeholder="Last name"
              />
            )}
          </div>

          {/* Email (read-only) */}
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] items-start md:items-center gap-1 md:gap-4 px-4 md:px-6 py-3.5 border-b border-border">
            <span className="text-sm text-muted-foreground">Email</span>
            {isLoading ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              <span className="text-sm text-muted-foreground">{profile?.email ?? "—"}</span>
            )}
          </div>

          {/* Designation */}
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] items-start md:items-center gap-1 md:gap-4 px-4 md:px-6 py-3.5 border-b border-border">
            <span className="text-sm text-muted-foreground">Designation</span>
            {isLoading ? (
              <Skeleton className="h-8 w-56" />
            ) : (
              <Input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="h-8 w-full max-w-64 text-sm bg-transparent"
                placeholder="e.g. Software Engineer"
              />
            )}
          </div>

          {/* Phone */}
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] items-start md:items-center gap-1 md:gap-4 px-4 md:px-6 py-3.5 border-b border-border">
            <span className="text-sm text-muted-foreground">Phone number</span>
            {isLoading ? (
              <Skeleton className="h-8 w-56" />
            ) : (
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="h-8 w-full max-w-64 text-sm bg-transparent"
                placeholder="+1 555 000 0000"
              />
            )}
          </div>

          {/* Save row */}
          <div className="flex justify-end px-6 py-4 border-b border-border">
            <Button size="sm" onClick={handleSave} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>

          {/* ── Connections section ── */}
          <div className="px-6 py-2 border-b border-border bg-muted/10">
            <p className="text-xs text-muted-foreground">Connections</p>
          </div>

          {/* Google account row */}
          <div className="px-4 md:px-6 py-3.5 border-b border-border">
            {isLoading ? (
              <Skeleton className="h-8 w-48" />
            ) : profile?.google_id ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <GoogleIcon className="size-3.5 shrink-0" />
                  <span className="text-foreground font-medium">Google</span>
                  <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                  <span className="text-foreground font-medium">Connected</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground truncate flex-1">{profile.email}</span>
                  <Button
                    size="sm"
                    className="h-7 gap-1.5 bg-red-600 hover:bg-red-700 text-white shrink-0"
                    onClick={handleUnlinkGoogle}
                    disabled={unlinkGoogle.isPending}
                  >
                    <XCircle className="size-3.5" />
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <GoogleIcon className="size-3.5 shrink-0" />
                <span className="text-sm font-medium">Google</span>
                <span className="text-sm text-muted-foreground">Not connected</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5"
                  onClick={handleConnectGoogle}
                >
                  Connect
                </Button>
              </div>
            )}
          </div>

          {/* ── Password section ── */}
          <div className="px-6 py-2 border-b border-border bg-muted/10">
            <p className="text-xs text-muted-foreground">Security</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] items-start md:items-center gap-1 md:gap-4 px-4 md:px-6 py-4 border-b border-border">
            <span className="text-sm text-muted-foreground">Password</span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {profile?.has_password === false ? "No password set" : "••••••••"}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5"
                onClick={() => setPwDialogOpen(true)}
              >
                <KeyRound className="size-3.5" />
                {profile?.has_password === false ? "Create password" : "Change password"}
              </Button>
            </div>
          </div>

          {/* ── Change/Create password dialog ── */}
          <Dialog open={pwDialogOpen} onOpenChange={(open) => { if (!open) resetPasswordDialog() }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {profile?.has_password === false ? "Create password" : "Change password"}
                </DialogTitle>
                <DialogDescription>
                  We'll send a 6-digit verification code to <span className="font-medium text-foreground">{profile?.email}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* OTP field + send/resend button */}
                <div className="space-y-2">
                  <Label className="text-sm">Verification code</Label>
                  <div className="flex items-center gap-3">
                    <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                    {!otpSent ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0"
                        onClick={handleSendOtp}
                        disabled={sendOtp.isPending}
                      >
                        {sendOtp.isPending ? "Sending…" : "Send code"}
                      </Button>
                    ) : resendTimer > 0 ? (
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums w-16 text-center">
                        Resend in {resendTimer}s
                      </span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 shrink-0 text-indigo-500 hover:text-indigo-600"
                        onClick={handleSendOtp}
                        disabled={sendOtp.isPending}
                      >
                        {sendOtp.isPending ? "Sending…" : "Resend"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* New password */}
                <div className="space-y-2">
                  <Label className="text-sm">New password</Label>
                  <div className="relative">
                    <Input
                      type={showNewPw ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-9 text-sm pr-9"
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showNewPw ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="space-y-2">
                  <Label className="text-sm">Confirm password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-9 text-sm"
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetPasswordDialog}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSetPassword}
                  disabled={setPassword.isPending || otpCode.length !== 6 || !newPassword || !confirmPassword}
                >
                  {setPassword.isPending ? "Saving…" : profile?.has_password === false ? "Create password" : "Update password"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </div>
  )
}
