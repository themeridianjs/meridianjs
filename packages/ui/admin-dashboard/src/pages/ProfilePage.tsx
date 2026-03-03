import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useMe, useUpdateProfile, useUploadAvatar, useRemoveAvatar, useUnlinkGoogle } from "@/api/hooks/useProfile"
import { useAuth } from "@/stores/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Camera, Trash2, User, CheckCircle2, XCircle } from "lucide-react"

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
  const unlinkGoogle  = useUnlinkGoogle()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [firstName,   setFirstName]   = useState("")
  const [lastName,    setLastName]    = useState("")
  const [designation, setDesignation] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")

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

  const handleConnectGoogle = async () => {
    try {
      const token = localStorage.getItem("meridian_token")
      const res = await fetch("/auth/google/link", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: { message?: string } }
        toast.error(data.error?.message ?? "Failed to get Google auth URL")
        return
      }
      const { url } = await res.json() as { url: string }
      window.location.href = url
    } catch {
      toast.error("Failed to initiate Google connection")
    }
  }

  const handleUnlinkGoogle = () => {
    unlinkGoogle.mutate(undefined, {
      onSuccess: () => toast.success("Google account disconnected"),
      onError: (err: any) => toast.error(err.message ?? "Failed to unlink Google account"),
    })
  }

  return (
    <div className="p-2 h-full">
      <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden flex flex-col h-full">

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
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <span className="text-sm text-muted-foreground w-44 shrink-0">Profile photo</span>
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
          <div className="grid grid-cols-[180px_1fr] items-center gap-4 px-6 py-3.5 border-b border-border">
            <span className="text-sm text-muted-foreground">First name</span>
            {isLoading ? (
              <Skeleton className="h-8 w-56" />
            ) : (
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-8 w-64 text-sm bg-transparent"
                placeholder="First name"
              />
            )}
          </div>

          {/* Last name */}
          <div className="grid grid-cols-[180px_1fr] items-center gap-4 px-6 py-3.5 border-b border-border">
            <span className="text-sm text-muted-foreground">Last name</span>
            {isLoading ? (
              <Skeleton className="h-8 w-56" />
            ) : (
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-8 w-64 text-sm bg-transparent"
                placeholder="Last name"
              />
            )}
          </div>

          {/* Email (read-only) */}
          <div className="grid grid-cols-[180px_1fr] items-center gap-4 px-6 py-3.5 border-b border-border">
            <span className="text-sm text-muted-foreground">Email</span>
            {isLoading ? (
              <Skeleton className="h-4 w-48" />
            ) : (
              <span className="text-sm text-muted-foreground">{profile?.email ?? "—"}</span>
            )}
          </div>

          {/* Designation */}
          <div className="grid grid-cols-[180px_1fr] items-center gap-4 px-6 py-3.5 border-b border-border">
            <span className="text-sm text-muted-foreground">Designation</span>
            {isLoading ? (
              <Skeleton className="h-8 w-56" />
            ) : (
              <Input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="h-8 w-64 text-sm bg-transparent"
                placeholder="e.g. Software Engineer"
              />
            )}
          </div>

          {/* Phone */}
          <div className="grid grid-cols-[180px_1fr] items-center gap-4 px-6 py-3.5 border-b border-border">
            <span className="text-sm text-muted-foreground">Phone number</span>
            {isLoading ? (
              <Skeleton className="h-8 w-56" />
            ) : (
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="h-8 w-64 text-sm bg-transparent"
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
          <div className="grid grid-cols-[180px_1fr] items-center gap-4 px-6 py-3.5 border-b border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GoogleIcon className="size-3.5 shrink-0" />
              Google
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-48" />
            ) : profile?.google_id ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                  <span className="text-foreground font-medium">Connected</span>
                  <span className="text-muted-foreground">· {profile.email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-muted-foreground hover:text-destructive ml-auto"
                  onClick={handleUnlinkGoogle}
                  disabled={unlinkGoogle.isPending}
                >
                  <XCircle className="size-3.5" />
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Not connected</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5"
                  onClick={handleConnectGoogle}
                >
                  <GoogleIcon className="size-3.5" />
                  Connect
                </Button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
