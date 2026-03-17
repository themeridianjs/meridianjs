import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useWorkspaces } from "@/api/hooks/useWorkspaces"
import { useProjectAccess } from "@/api/hooks/useProjectAccess"
import { useTransferProject } from "@/api/hooks/useProjects"
import { toast } from "sonner"
import { AlertTriangle, ArrowRightLeft, Users2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface TransferProjectDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  projectName: string
  currentWorkspaceId: string
}

export function TransferProjectDialog({
  open,
  onClose,
  projectId,
  projectName,
  currentWorkspaceId,
}: TransferProjectDialogProps) {
  const [step, setStep] = useState<"workspace" | "members">("workspace")
  const [targetWorkspaceId, setTargetWorkspaceId] = useState<string>("")
  const [checkedUserIds, setCheckedUserIds] = useState<Set<string>>(new Set())

  const { data: allWorkspaces, isLoading: workspacesLoading } = useWorkspaces()
  const { data: access, isLoading: accessLoading } = useProjectAccess(projectId)
  const transfer = useTransferProject(projectId)

  const targetWorkspaces = (allWorkspaces ?? []).filter((w) => w.id !== currentWorkspaceId)
  const targetWorkspace = targetWorkspaces.find((w) => w.id === targetWorkspaceId)

  // Initialize checked members when entering the members step
  useEffect(() => {
    if (step === "members" && access?.members) {
      setCheckedUserIds(new Set(access.members.map((m) => m.user_id)))
    }
  }, [step, access?.members])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep("workspace")
      setTargetWorkspaceId("")
      setCheckedUserIds(new Set())
    }
  }, [open])

  const toggleUser = (userId: string) => {
    setCheckedUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const handleTransfer = () => {
    transfer.mutate(
      {
        target_workspace_id: targetWorkspaceId,
        carry_over_user_ids: [...checkedUserIds],
      },
      {
        onSuccess: () => {
          toast.success("Project transferred")
          onClose()
        },
        onError: (err: any) => {
          const message = err?.response?.data?.error?.message ?? err?.message ?? "Unknown error"
          toast.error(`Transfer failed: ${message}`)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {step === "workspace" ? `Transfer "${projectName}"` : "Review Members"}
          </DialogTitle>
        </DialogHeader>

        {step === "workspace" ? (
          <div className="space-y-4 pt-1">
            {/* Warning banner */}
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20 px-3.5 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                This will move the project and all its issues to another workspace.
              </p>
            </div>

            {/* Workspace selector */}
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Target workspace</p>
              {workspacesLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : targetWorkspaces.length === 0 ? (
                <p className="text-sm text-muted-foreground">No other workspaces available.</p>
              ) : (
                <Select value={targetWorkspaceId} onValueChange={setTargetWorkspaceId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a workspace…" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetWorkspaces.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!targetWorkspaceId}
                onClick={() => setStep("members")}
              >
                Next: Review Members →
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Select who to carry over. Selected members will be added to{" "}
              <span className="font-medium text-foreground">{targetWorkspace?.name}</span> if not already a member.
            </p>

            {/* Member list */}
            {accessLoading ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <Skeleton className="h-3.5 w-36" />
                  </div>
                ))}
              </div>
            ) : (access?.members ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No project members to review.</p>
            ) : (
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {(access?.members ?? []).map((m) => {
                  const u = m.user
                  const first = u?.first_name ?? ""
                  const last = u?.last_name ?? ""
                  const displayName = `${first} ${last}`.trim() || u?.email || "Unknown"
                  const initials = (first[0] ?? last[0] ?? u?.email?.[0] ?? "U").toUpperCase()
                  const checked = checkedUserIds.has(m.user_id)

                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-2.5 py-1.5 cursor-pointer"
                      onClick={() => toggleUser(m.user_id)}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleUser(m.user_id)}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0"
                      />
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="text-[11px] font-medium">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm truncate block">{displayName}</span>
                        {u?.email && (
                          <span className="text-xs text-muted-foreground truncate block">{u.email}</span>
                        )}
                      </div>
                      <span className={cn(
                        "text-[11px] px-1.5 py-0.5 rounded font-medium shrink-0",
                        m.role === "manager" ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400" : "bg-muted text-muted-foreground"
                      )}>
                        {m.role}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Teams note */}
            {(access?.teams ?? []).length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                <Users2 className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Project teams will be removed as they belong to the current workspace.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setStep("workspace")}>
                ← Back
              </Button>
              <Button
                size="sm"
                disabled={transfer.isPending}
                onClick={handleTransfer}
              >
                <ArrowRightLeft className="h-4 w-4" />
                {transfer.isPending ? "Transferring…" : "Transfer Project"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
