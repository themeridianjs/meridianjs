import { useRef, useState } from "react"
import { useCreateComment } from "@/api/hooks/useIssues"
import { useUploadAttachment } from "@/api/hooks/useAttachments"
import { useAuth } from "@/stores/auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FileTypeIcon, formatBytes } from "@/components/issues/AttachmentViewer"
import { Paperclip, Send, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface CommentInputProps {
  issueId: string
  /** Smaller layout for the sheet sticky footer */
  compact?: boolean
  className?: string
  onSuccess?: () => void
}

export function CommentInput({ issueId, compact, className, onSuccess }: CommentInputProps) {
  const [body, setBody] = useState("")
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { user: currentUser } = useAuth()
  const createComment = useCreateComment(issueId)
  const uploadAttachment = useUploadAttachment(issueId)

  const initials = currentUser
    ? `${currentUser.first_name?.[0] ?? ""}${currentUser.last_name?.[0] ?? ""}`.toUpperCase() || "?"
    : "?"

  const canSubmit = body.trim().length > 0 || pendingFiles.length > 0

  const addFiles = (files: File[]) => {
    setPendingFiles((prev) => {
      // Deduplicate by name+size
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}`))
      return [...prev, ...files.filter((f) => !existing.has(`${f.name}-${f.size}`))]
    })
  }

  const removeFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return
    setIsSubmitting(true)

    try {
      // Step 1: create the comment (body may be empty if only files are attached)
      const result = await createComment.mutateAsync(body.trim() || " ")
      const commentId = result.comment.id

      // Step 2: upload each pending file linked to the comment
      for (const file of pendingFiles) {
        await uploadAttachment.mutateAsync({ file, commentId })
      }

      setBody("")
      setPendingFiles([])
      toast.success("Comment added")
      onSuccess?.()
    } catch {
      toast.error("Failed to add comment")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit()
  }

  return (
    <div className={cn("flex gap-3 items-start", className)}>
      <Avatar className={cn("shrink-0 mt-1", compact ? "h-7 w-7" : "h-7 w-7")}>
        <AvatarFallback className="text-[11px] bg-muted text-muted-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        {/* Textarea */}
        <Textarea
          placeholder="Leave a comment…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          className={cn(
            "resize-none text-sm bg-transparent w-full",
            compact ? "min-h-[68px]" : "min-h-[72px]"
          )}
        />

        {/* Pending file chips */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {pendingFiles.map((file, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-md bg-muted border border-border text-[11px] text-foreground max-w-[180px]"
              >
                <FileTypeIcon mimeType={file.type} className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{file.name}</span>
                <span className="text-muted-foreground shrink-0">({formatBytes(file.size)})</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="ml-0.5 rounded hover:text-destructive transition-colors shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
              title="Attach files"
            >
              <Paperclip className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[11px] text-muted-foreground/50 hidden sm:block">
              <kbd className="px-1 py-0.5 rounded border border-border bg-muted font-mono text-[10px]">⌘ Enter</kbd> to submit
            </span>
          </div>

          <Button
            size="icon"
            className="h-8 w-8"
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            if (files.length > 0) addFiles(files)
            e.target.value = ""
          }}
        />
      </div>
    </div>
  )
}
