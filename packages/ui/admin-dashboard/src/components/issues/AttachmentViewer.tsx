/**
 * Shared attachment viewer utilities.
 * Used by IssueAttachments (full list tab) and comment attachment inline rendering.
 */
import { useState } from "react"
import { format } from "date-fns"
import type { Attachment } from "@/api/hooks/useAttachments"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  FileText, FileImage, FileArchive, FileCode, File, Download, Play,
} from "lucide-react"

// ── Pure helpers ──────────────────────────────────────────────────────────────

export function isImage(mimeType: string) {
  return mimeType.startsWith("image/")
}

export function isVideo(mimeType: string) {
  return mimeType.startsWith("video/")
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function downloadFile(url: string, filename: string) {
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.style.display = "none"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// ── File icon ─────────────────────────────────────────────────────────────────

export function FileTypeIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  if (isImage(mimeType)) return <FileImage className={className} />
  if (isVideo(mimeType)) return <Play className={className} />
  if (mimeType.startsWith("text/") || mimeType.includes("json")) return <FileCode className={className} />
  if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("gz")) return <FileArchive className={className} />
  if (mimeType.includes("pdf") || mimeType.includes("word") || mimeType.includes("document")) return <FileText className={className} />
  return <File className={className} />
}

// ── Viewer modal ──────────────────────────────────────────────────────────────

interface ViewerModalProps {
  attachment: Attachment | null
  onClose: () => void
}

export function ViewerModal({ attachment, onClose }: ViewerModalProps) {
  if (!attachment) return null

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-full p-0 overflow-hidden">
        <DialogHeader className="flex-row items-center justify-between px-4 py-3 border-b border-border shrink-0 pr-10">
          <DialogTitle className="text-sm font-medium truncate">
            {attachment.original_name}
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5 shrink-0"
            onClick={() => downloadFile(attachment.url, attachment.original_name)}
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
        </DialogHeader>

        <div className="flex items-center justify-center bg-black/5 dark:bg-black/30 min-h-[320px] max-h-[75vh] overflow-auto">
          {isImage(attachment.mime_type) && (
            <img
              src={attachment.url}
              alt={attachment.original_name}
              className="max-w-full max-h-[75vh] object-contain"
            />
          )}
          {isVideo(attachment.mime_type) && (
            <video
              src={attachment.url}
              controls
              className="max-w-full max-h-[75vh]"
            />
          )}
        </div>

        <div className="px-4 py-2 border-t border-border text-[11px] text-muted-foreground flex items-center gap-3">
          <span>{formatBytes(attachment.size)}</span>
          <span>·</span>
          <span>{attachment.mime_type}</span>
          <span>·</span>
          <span>Uploaded {format(new Date(attachment.created_at), "MMM d, yyyy")}</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Inline attachment item (for use inside comments) ──────────────────────────

/**
 * Compact clickable attachment row used inside comment bubbles.
 * Images render as a thumbnail; other files show as a file chip.
 */
export function InlineAttachment({ attachment }: { attachment: Attachment }) {
  const [viewing, setViewing] = useState<Attachment | null>(null)
  const viewable = isImage(attachment.mime_type) || isVideo(attachment.mime_type)

  const handleClick = () => {
    if (viewable) setViewing(attachment)
    else downloadFile(attachment.url, attachment.original_name)
  }

  return (
    <>
      {isImage(attachment.mime_type) ? (
        <button
          type="button"
          onClick={handleClick}
          className="block rounded-md overflow-hidden border border-border hover:opacity-90 transition-opacity"
          title={attachment.original_name}
        >
          <img
            src={attachment.url}
            alt={attachment.original_name}
            className="max-h-48 max-w-xs object-cover"
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted transition-colors text-left max-w-xs"
          title={viewable ? "View" : "Download"}
        >
          <FileTypeIcon mimeType={attachment.mime_type} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="text-xs text-foreground truncate">{attachment.original_name}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">{formatBytes(attachment.size)}</span>
          {!viewable && <Download className="h-3 w-3 shrink-0 text-muted-foreground" />}
        </button>
      )}

      {viewing && (
        <ViewerModal attachment={viewing} onClose={() => setViewing(null)} />
      )}
    </>
  )
}
