import { useRef, useState, useMemo } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Placeholder from "@tiptap/extension-placeholder"
import { Extension } from "@tiptap/core"
import { useCreateComment } from "@/api/hooks/useIssues"
import { useUploadAttachment } from "@/api/hooks/useAttachments"
import { useAuth } from "@/stores/auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { FileTypeIcon, formatBytes } from "@/components/issues/AttachmentViewer"
import {
  Bold, Italic, Strikethrough, Code,
  List, ListOrdered, Code2,
  Paperclip, Send, X,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ── Toolbar ───────────────────────────────────────────────────────────────────

function ToolbarBtn({
  onClick, active, title, children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded transition-colors shrink-0",
        "text-muted-foreground hover:text-foreground hover:bg-muted",
        active && "bg-muted text-foreground"
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="mx-0.5 h-3.5 w-px shrink-0 bg-border" />
}

// ── Component ─────────────────────────────────────────────────────────────────

interface CommentInputProps {
  issueId: string
  /** Smaller layout for the sheet sticky footer */
  compact?: boolean
  className?: string
  onSuccess?: () => void
}

export function CommentInput({ issueId, compact, className, onSuccess }: CommentInputProps) {
  const [editorEmpty, setEditorEmpty] = useState(true)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const handleSubmitRef = useRef<() => Promise<void>>(async () => {})

  const { user: currentUser } = useAuth()
  const createComment = useCreateComment(issueId)
  const uploadAttachment = useUploadAttachment(issueId)

  const initials = currentUser
    ? `${currentUser.first_name?.[0] ?? ""}${currentUser.last_name?.[0] ?? ""}`.toUpperCase() || "?"
    : "?"

  // Keyboard shortcut extension — created once; calls handleSubmitRef so it
  // always invokes the latest version of handleSubmit without reinitialising
  // the editor.
  const SubmitShortcut = useMemo(
    () =>
      Extension.create({
        name: "submitShortcut",
        addKeyboardShortcuts() {
          return {
            "Mod-Enter": () => {
              handleSubmitRef.current()
              return true
            },
          }
        },
      }),
    []
  )

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: "Leave a comment…" }),
      SubmitShortcut,
    ],
    editorProps: {
      attributes: { class: "meridian-editor" },
    },
    onUpdate({ editor }) {
      setEditorEmpty(editor.isEmpty)
    },
  })

  const canSubmit = !editorEmpty || pendingFiles.length > 0

  const addFiles = (files: File[]) => {
    setPendingFiles((prev) => {
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
      const html = editor?.isEmpty ? "" : (editor?.getHTML() ?? "")
      const result = await createComment.mutateAsync(html || " ")
      const commentId = result.comment.id

      for (const file of pendingFiles) {
        await uploadAttachment.mutateAsync({ file, commentId })
      }

      editor?.commands.clearContent()
      setEditorEmpty(true)
      setPendingFiles([])
      toast.success("Comment added")
      onSuccess?.()
    } catch {
      toast.error("Failed to add comment")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Keep the ref pointing to the latest handleSubmit
  handleSubmitRef.current = handleSubmit

  const sz = "h-3 w-3"

  return (
    <div className={cn("flex gap-3 items-start", className)}>
      <Avatar className="h-7 w-7 shrink-0 mt-1">
        <AvatarFallback className="text-[11px] bg-muted text-muted-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "rounded-md border border-input overflow-hidden transition-shadow",
            "focus-within:ring-1 focus-within:ring-ring",
            isSubmitting && "opacity-60 pointer-events-none"
          )}
        >
          {/* Slim toolbar */}
          {editor && (
            <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border/70 bg-muted/30">
              <ToolbarBtn
                title="Bold (⌘B)"
                active={editor.isActive("bold")}
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <Bold className={sz} />
              </ToolbarBtn>
              <ToolbarBtn
                title="Italic (⌘I)"
                active={editor.isActive("italic")}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <Italic className={sz} />
              </ToolbarBtn>
              <ToolbarBtn
                title="Strikethrough"
                active={editor.isActive("strike")}
                onClick={() => editor.chain().focus().toggleStrike().run()}
              >
                <Strikethrough className={sz} />
              </ToolbarBtn>
              <ToolbarBtn
                title="Inline code"
                active={editor.isActive("code")}
                onClick={() => editor.chain().focus().toggleCode().run()}
              >
                <Code className={sz} />
              </ToolbarBtn>
              <Divider />
              <ToolbarBtn
                title="Bullet list"
                active={editor.isActive("bulletList")}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                <List className={sz} />
              </ToolbarBtn>
              <ToolbarBtn
                title="Ordered list"
                active={editor.isActive("orderedList")}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              >
                <ListOrdered className={sz} />
              </ToolbarBtn>
              <Divider />
              <ToolbarBtn
                title="Code block"
                active={editor.isActive("codeBlock")}
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              >
                <Code2 className={sz} />
              </ToolbarBtn>
            </div>
          )}

          {/* Editor area */}
          <EditorContent
            editor={editor}
            className={cn("px-3 py-2.5 text-sm", compact ? "min-h-[68px]" : "min-h-[80px]")}
          />
        </div>

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
