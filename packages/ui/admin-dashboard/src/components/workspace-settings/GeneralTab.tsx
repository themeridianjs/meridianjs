import React, { useState, useEffect, useRef } from "react"
import {
  useWorkspaces,
  useUpdateWorkspace,
  useUploadWorkspaceLogo,
  useRemoveWorkspaceLogo,
} from "@/api/hooks/useWorkspaces"
import { useAuth } from "@/stores/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { format } from "date-fns"
import { Lock } from "lucide-react"
import { CopyButton } from "./CopyButton"

export function GeneralTab({ workspaceId }: { workspaceId: string }) {
  const { workspace: wsRef, setWorkspace } = useAuth()
  const { data: workspaces, isLoading } = useWorkspaces()
  const workspace = workspaces?.find((w) => w.id === wsRef?.id)
  const updateWorkspace = useUpdateWorkspace(workspaceId)
  const uploadLogo = useUploadWorkspaceLogo(workspaceId)
  const removeLogo = useRemoveWorkspaceLogo(workspaceId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState("")

  useEffect(() => {
    if (workspace) setName(workspace.name)
  }, [workspace?.name])

  const isDirty = workspace ? name.trim() !== workspace.name : false

  const handleSave = () => {
    if (!name.trim() || !workspace) return
    updateWorkspace.mutate(
      { name: name.trim() },
      {
        onSuccess: (data) => {
          setWorkspace({ id: data.workspace.id, name: data.workspace.name, slug: data.workspace.slug, logo_url: data.workspace.logo_url })
          toast.success("Workspace updated")
        },
        onError: () => toast.error("Failed to update workspace"),
      }
    )
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    uploadLogo.mutate(file, {
      onSuccess: (data) => {
        setWorkspace({ id: data.workspace.id, name: data.workspace.name, slug: data.workspace.slug, logo_url: data.workspace.logo_url })
        toast.success("Logo updated")
      },
      onError: () => toast.error("Failed to upload logo"),
    })
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleLogoRemove = () => {
    removeLogo.mutate(undefined, {
      onSuccess: (data) => {
        setWorkspace({ id: data.workspace.id, name: data.workspace.name, slug: data.workspace.slug, logo_url: null })
        toast.success("Logo removed")
      },
      onError: () => toast.error("Failed to remove logo"),
    })
  }

  return (
    <>
      <div className="px-6 py-2 border-b border-border bg-muted/20">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Workspace details
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] items-start md:items-center gap-1 md:gap-4 px-4 md:px-6 py-3.5 border-b border-border">
        <span className="text-sm text-muted-foreground">Logo</span>
        {isLoading ? (
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-lg bg-muted animate-pulse" />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {workspace?.logo_url ? (
              <img
                src={workspace.logo_url}
                alt="Workspace logo"
                className="size-12 rounded-lg object-cover shrink-0 border border-border"
              />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-lg bg-foreground text-background shrink-0">
                <span className="text-lg font-bold">
                  {(workspace?.name?.[0] ?? "M").toUpperCase()}
                </span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadLogo.isPending}
            >
              {uploadLogo.isPending ? "Uploading…" : "Upload logo"}
            </Button>
            {workspace?.logo_url && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-muted-foreground"
                onClick={handleLogoRemove}
                disabled={removeLogo.isPending}
              >
                {removeLogo.isPending ? "Removing…" : "Remove"}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] items-start md:items-center gap-1 md:gap-4 px-4 md:px-6 py-3.5 border-b border-border">
        <span className="text-sm text-muted-foreground">Name</span>
        {isLoading ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          <div className="flex items-center gap-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 w-full max-w-64 text-sm bg-transparent"
              placeholder="Workspace name"
            />
            {isDirty && (
              <Button
                size="sm"
                className="h-8"
                onClick={handleSave}
                disabled={!name.trim() || updateWorkspace.isPending}
              >
                {updateWorkspace.isPending ? "Saving…" : "Save"}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] items-start md:items-center gap-1 md:gap-4 px-4 md:px-6 py-3.5 border-b border-border">
        <span className="text-sm text-muted-foreground">URL slug</span>
        {isLoading ? (
          <Skeleton className="h-4 w-40" />
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono text-foreground">{workspace?.slug}</span>
            <CopyButton value={workspace?.slug ?? ""} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] items-start md:items-center gap-1 md:gap-4 px-4 md:px-6 py-3.5 border-b border-border">
        <span className="text-sm text-muted-foreground">Plan</span>
        {isLoading ? (
          <Skeleton className="h-4 w-16" />
        ) : (
          <span className="text-sm capitalize">{workspace?.plan ?? "free"}</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] items-start md:items-center gap-1 md:gap-4 px-4 md:px-6 py-3.5 border-b border-border">
        <span className="text-sm text-muted-foreground">Visibility</span>
        {isLoading ? (
          <Skeleton className="h-4 w-28" />
        ) : (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={workspace?.is_private ?? false}
                onChange={(e) => {
                  updateWorkspace.mutate(
                    { is_private: e.target.checked },
                    {
                      onSuccess: () => toast.success(e.target.checked ? "Workspace is now public" : "Workspace is now private"),
                      onError: () => toast.error("Failed to update visibility"),
                    }
                  )
                }}
                className="size-4 rounded border-border accent-indigo-600"
              />
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">Private</span>
            </label>
            <span className="text-xs text-muted-foreground">
              {workspace?.is_private
                ? "Only members can see this workspace"
                : "Admins can see this workspace without being a member"}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] items-start md:items-center gap-1 md:gap-4 px-4 md:px-6 py-3.5">
        <span className="text-sm text-muted-foreground">Created</span>
        {isLoading ? (
          <Skeleton className="h-4 w-28" />
        ) : (
          <span className="text-sm text-muted-foreground">
            {workspace?.created_at
              ? format(new Date(workspace.created_at), "MMMM d, yyyy")
              : "—"}
          </span>
        )}
      </div>
    </>
  )
}
