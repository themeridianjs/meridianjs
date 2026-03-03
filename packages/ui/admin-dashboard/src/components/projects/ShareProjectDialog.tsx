import { useState } from "react"
import { Link2, Copy, Trash2, Globe, Lock } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useGenerateShareToken, useRevokeShareToken } from "@/api/hooks/useProjects"
import type { Project } from "@/api/hooks/useProjects"

interface ShareProjectDialogProps {
  open: boolean
  onClose: () => void
  project: Project
}

export function ShareProjectDialog({ open, onClose, project }: ShareProjectDialogProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const generate = useGenerateShareToken(project.id)
  const revoke = useRevokeShareToken(project.id)

  // Derive current share URL from the project token if we haven't just generated one
  const currentToken = project.share_token
  const currentShareUrl = shareUrl ?? (currentToken ? `${window.location.origin}/share/${currentToken}` : null)

  const handleEnable = () => {
    generate.mutate(undefined, {
      onSuccess: (data) => {
        const url = `${window.location.origin}/share/${data.project.share_token}`
        setShareUrl(url)
        toast.success("Public link enabled")
      },
      onError: () => toast.error("Failed to enable public link"),
    })
  }

  const handleRevoke = () => {
    revoke.mutate(undefined, {
      onSuccess: () => {
        setShareUrl(null)
        toast.success("Public link revoked")
      },
      onError: () => toast.error("Failed to revoke link"),
    })
  }

  const handleCopy = () => {
    if (!currentShareUrl) return
    navigator.clipboard.writeText(currentShareUrl).then(() => {
      toast.success("Link copied to clipboard")
    })
  }

  const isPublic = !!currentShareUrl

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Share project
          </DialogTitle>
          <DialogDescription>
            Allow anyone with the link to view this project without logging in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {isPublic ? (
            <>
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 overflow-hidden">
                <Globe className="h-3.5 w-3.5 text-green-600 shrink-0" />
                <span className="text-xs text-muted-foreground min-w-0 flex-1 break-all">{currentShareUrl}</span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={handleCopy}>
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleRevoke}
                  disabled={revoke.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Revoke
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Anyone with this link can view the board, issues, and timeline. No account required.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-center justify-center">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">This project is private</span>
              </div>

              <Button
                className="w-full"
                onClick={handleEnable}
                disabled={generate.isPending}
              >
                <Globe className="h-4 w-4 mr-2" />
                Enable public link
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Generates a secret link for read-only access. No write permissions granted.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
