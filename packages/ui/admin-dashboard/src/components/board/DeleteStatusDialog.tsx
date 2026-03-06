import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ProjectStatus } from "@/api/hooks/useProjectStatuses"

interface DeleteStatusDialogProps {
  open: boolean
  statusName: string
  issueCount: number
  otherStatuses: ProjectStatus[]
  onConfirm: (targetStatusId: string | null) => void
  onCancel: () => void
  isLoading: boolean
}

export function DeleteStatusDialog({
  open,
  statusName,
  issueCount,
  otherStatuses,
  onConfirm,
  onCancel,
  isLoading,
}: DeleteStatusDialogProps) {
  const [targetStatusId, setTargetStatusId] = useState<string>("")

  const handleConfirm = () => {
    if (issueCount > 0 && !targetStatusId) return
    onConfirm(issueCount > 0 ? targetStatusId : null)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete status</DialogTitle>
          <DialogDescription>
            {issueCount > 0
              ? `${issueCount} issue${issueCount !== 1 ? "s" : ""} in "${statusName}" will be moved to another status.`
              : `Delete the "${statusName}" status. This cannot be undone.`}
          </DialogDescription>
        </DialogHeader>

        {issueCount > 0 && (
          <div className="py-2">
            <label className="text-sm font-medium mb-1.5 block">Move issues to</label>
            <Select value={targetStatusId} onValueChange={setTargetStatusId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a status..." />
              </SelectTrigger>
              <SelectContent>
                {otherStatuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={(issueCount > 0 && !targetStatusId) || isLoading}
          >
            {isLoading ? "Deleting…" : "Delete status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
