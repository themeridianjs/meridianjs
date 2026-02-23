import { useRef, useState, useCallback } from "react"
import { format } from "date-fns"
import { useAttachments, useUploadAttachment, useDeleteAttachment } from "@/api/hooks/useAttachments"
import type { Attachment } from "@/api/hooks/useAttachments"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  Paperclip, Upload, Trash2, FileText, FileImage, FileArchive, FileCode, File,
} from "lucide-react"
import { toast } from "sonner"

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  if (mimeType.startsWith("image/")) return <FileImage className={className} />
  if (mimeType.startsWith("text/") || mimeType.includes("json")) return <FileCode className={className} />
  if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("gz")) return <FileArchive className={className} />
  if (mimeType.includes("pdf") || mimeType.includes("word") || mimeType.includes("document")) return <FileText className={className} />
  return <File className={className} />
}

function AttachmentRow({
  attachment,
  onDelete,
  isDeleting,
}: {
  attachment: Attachment
  onDelete: (id: string) => void
  isDeleting: boolean
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 group transition-colors">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <FileIcon mimeType={attachment.mime_type} className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <a
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-foreground truncate block hover:underline"
        >
          {attachment.original_name}
        </a>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {formatBytes(attachment.size)} · {format(new Date(attachment.created_at), "MMM d, yyyy")}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
        onClick={() => onDelete(attachment.id)}
        disabled={isDeleting}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

// ── Drop zone ─────────────────────────────────────────────────────────────────

interface DropZoneProps {
  onFiles: (files: File[]) => void
  isUploading: boolean
}

function DropZone({ onFiles, isUploading }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) onFiles(files)
    },
    [onFiles]
  )

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !isUploading && inputRef.current?.click()}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6",
        "cursor-pointer transition-colors",
        isDragging
          ? "border-primary/60 bg-primary/5"
          : "border-border hover:border-muted-foreground/40 hover:bg-muted/30",
        isUploading && "opacity-60 cursor-wait"
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
        <Upload className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-xs font-medium text-foreground">
        {isUploading ? "Uploading…" : "Drop files or click to browse"}
      </p>
      <p className="text-[11px] text-muted-foreground">Up to 50 MB per file</p>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          if (files.length > 0) onFiles(files)
          e.target.value = ""
        }}
      />
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

interface IssueAttachmentsProps {
  issueId: string
  className?: string
}

export function IssueAttachments({ issueId, className }: IssueAttachmentsProps) {
  const { data: attachments, isLoading } = useAttachments(issueId)
  const upload = useUploadAttachment(issueId)
  const deleteAttachment = useDeleteAttachment(issueId)

  const handleFiles = (files: File[]) => {
    files.forEach((file) => {
      upload.mutate(file, {
        onSuccess: () => toast.success(`${file.name} uploaded`),
        onError: () => toast.error(`Failed to upload ${file.name}`),
      })
    })
  }

  const handleDelete = (id: string) => {
    const attachment = attachments?.find((a) => a.id === id)
    if (!attachment) return
    deleteAttachment.mutate(id, {
      onSuccess: () => toast.success("Attachment removed"),
      onError: () => toast.error("Failed to remove attachment"),
    })
  }

  return (
    <div className={cn("px-6 py-4 space-y-4", className)}>
      <DropZone onFiles={handleFiles} isUploading={upload.isPending} />

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3">
              <Skeleton className="h-8 w-8 rounded-md shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-2.5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : attachments && attachments.length > 0 ? (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Paperclip className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {attachments.length} {attachments.length === 1 ? "file" : "files"}
            </span>
          </div>
          <div>
            {attachments.map((a) => (
              <AttachmentRow
                key={a.id}
                attachment={a}
                onDelete={handleDelete}
                isDeleting={deleteAttachment.isPending}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground/50 text-center py-1">
          No attachments yet.
        </p>
      )}
    </div>
  )
}
