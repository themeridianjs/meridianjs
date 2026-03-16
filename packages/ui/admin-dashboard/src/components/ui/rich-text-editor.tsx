import DOMPurify from "dompurify"
import { useRef, useState, useMemo, useCallback } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Placeholder from "@tiptap/extension-placeholder"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import Mention from "@tiptap/extension-mention"
import { MentionSuggestion, type MentionItem } from "@/components/issues/MentionSuggestion"
import { cn } from "@/lib/utils"
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks,
  Quote, Code2, Minus,
  Undo2, Redo2,
} from "lucide-react"

export type { MentionItem }

interface MentionPopupState {
  active: boolean
  items: MentionItem[]
  selectedIndex: number
  rect: DOMRect | null
  command: ((item: MentionItem) => void) | null
}

const EMPTY_POPUP: MentionPopupState = { active: false, items: [], selectedIndex: 0, rect: null, command: null }

// ── Toolbar primitives ────────────────────────────────────────────────────────

interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarBtn({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault() // keep focus in editor
        onClick()
      }}
      className={cn(
        "flex h-[26px] w-[26px] items-center justify-center rounded transition-colors shrink-0",
        "text-muted-foreground hover:text-foreground hover:bg-muted",
        "disabled:opacity-30 disabled:cursor-not-allowed",
        active && "bg-muted text-foreground"
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="mx-0.5 h-4 w-px shrink-0 bg-border" />
}

// ── Main component ────────────────────────────────────────────────────────────

interface RichTextEditorProps {
  content?: string
  onChange?: (html: string) => void
  placeholder?: string
  className?: string
  toolbarClassName?: string
  editorClassName?: string
  users?: MentionItem[]
}

export function RichTextEditor({
  content = "",
  onChange,
  placeholder = "Add a description…",
  className,
  toolbarClassName,
  editorClassName,
  users,
}: RichTextEditorProps) {
  const [mentionPopup, setMentionPopup] = useState<MentionPopupState>(EMPTY_POPUP)
  const setMentionPopupRef = useRef(setMentionPopup)
  setMentionPopupRef.current = setMentionPopup
  const usersRef = useRef<MentionItem[]>([])
  if (users) usersRef.current = users
  const mentionItemsRef = useRef<MentionItem[]>([])
  const mentionCommandRef = useRef<((item: MentionItem) => void) | null>(null)
  const mentionSelectedIndexRef = useRef(0)

  const MentionExt = useMemo(
    () =>
      users !== undefined
        ? Mention.configure({
            HTMLAttributes: { class: "mention" },
            suggestion: {
              items: ({ query }: { query: string }) => {
                const members = usersRef.current
                if (!members.length) return []
                const q = query.toLowerCase()
                return members
                  .filter((m) => !q || m.label.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
                  .slice(0, 8)
              },
              render: () => ({
                onStart: (props: any) => {
                  mentionItemsRef.current = props.items
                  mentionCommandRef.current = props.command
                  mentionSelectedIndexRef.current = 0
                  setMentionPopupRef.current({ active: true, items: props.items, selectedIndex: 0, rect: props.clientRect?.() ?? null, command: props.command })
                },
                onUpdate: (props: any) => {
                  mentionItemsRef.current = props.items
                  mentionCommandRef.current = props.command
                  mentionSelectedIndexRef.current = 0
                  setMentionPopupRef.current({ active: true, items: props.items, selectedIndex: 0, rect: props.clientRect?.() ?? null, command: props.command })
                },
                onKeyDown: ({ event }: { event: KeyboardEvent }) => {
                  const items = mentionItemsRef.current
                  if (!items.length) return false
                  if (event.key === "Escape") { setMentionPopupRef.current(EMPTY_POPUP); return true }
                  if (event.key === "ArrowDown") {
                    const next = (mentionSelectedIndexRef.current + 1) % items.length
                    mentionSelectedIndexRef.current = next
                    setMentionPopupRef.current((prev) => ({ ...prev, selectedIndex: next }))
                    return true
                  }
                  if (event.key === "ArrowUp") {
                    const prev = (mentionSelectedIndexRef.current - 1 + items.length) % items.length
                    mentionSelectedIndexRef.current = prev
                    setMentionPopupRef.current((prevState) => ({ ...prevState, selectedIndex: prev }))
                    return true
                  }
                  if (event.key === "Enter") {
                    const item = items[mentionSelectedIndexRef.current]
                    if (item) mentionCommandRef.current?.(item)
                    return true
                  }
                  return false
                },
                onExit: () => {
                  setMentionPopupRef.current(EMPTY_POPUP)
                  mentionCommandRef.current = null
                },
              }),
            },
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [users !== undefined]
  )

  const handleMentionSelect = useCallback((item: MentionItem) => {
    mentionCommandRef.current?.(item)
    setMentionPopup(EMPTY_POPUP)
  }, [])

  const editorContainerRef = useRef<HTMLDivElement>(null)

  const popupAbsoluteStyle = useMemo<React.CSSProperties>(() => {
    if (!mentionPopup.rect || !editorContainerRef.current) return { top: 0, left: 0 }
    const containerRect = editorContainerRef.current.getBoundingClientRect()
    return {
      top: mentionPopup.rect.bottom - containerRect.top + 4,
      left: Math.max(0, mentionPopup.rect.left - containerRect.left),
    }
  }, [mentionPopup.rect])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
      ...(MentionExt ? [MentionExt] : []),
    ],
    content: content || "",
    editorProps: {
      attributes: { class: "meridian-editor" },
    },
    onUpdate({ editor }) {
      if (!onChange) return
      // Treat a document that's just an empty paragraph as empty string
      onChange(editor.isEmpty ? "" : editor.getHTML())
    },
  })

  if (!editor) return null

  const btn = (
    label: string,
    icon: React.ReactNode,
    action: () => void,
    active?: boolean,
    disabled?: boolean
  ) => (
    <ToolbarBtn key={label} title={label} onClick={action} active={active} disabled={disabled}>
      {icon}
    </ToolbarBtn>
  )

  const sz = "h-3.5 w-3.5"

  // Outer div is relative (popup anchor) — inner div holds overflow-hidden + className styling
  return (
    <div ref={editorContainerRef} className="relative">
      <div className={cn("flex flex-col overflow-hidden", className)}>
        {/* ── Toolbar ──────────────────────────────────────────────────────── */}
        <div
          className={cn(
            "flex flex-wrap items-center gap-0.5 px-3 py-1.5 border-b border-border bg-muted/30",
            toolbarClassName
          )}
        >
          {btn("Undo", <Undo2 className={sz} />, () => editor.chain().focus().undo().run(), false, !editor.can().undo())}
          {btn("Redo", <Redo2 className={sz} />, () => editor.chain().focus().redo().run(), false, !editor.can().redo())}
          <Divider />

          {btn("Bold (⌘B)",        <Bold className={sz} />,          () => editor.chain().focus().toggleBold().run(),        editor.isActive("bold"))}
          {btn("Italic (⌘I)",      <Italic className={sz} />,        () => editor.chain().focus().toggleItalic().run(),      editor.isActive("italic"))}
          {btn("Underline (⌘U)",   <UnderlineIcon className={sz} />, () => editor.chain().focus().toggleUnderline().run(),   editor.isActive("underline"))}
          {btn("Strikethrough",    <Strikethrough className={sz} />, () => editor.chain().focus().toggleStrike().run(),      editor.isActive("strike"))}
          {btn("Inline code",      <Code className={sz} />,          () => editor.chain().focus().toggleCode().run(),        editor.isActive("code"))}
          <Divider />

          {btn("Heading 1", <Heading1 className={sz} />, () => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive("heading", { level: 1 }))}
          {btn("Heading 2", <Heading2 className={sz} />, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }))}
          {btn("Heading 3", <Heading3 className={sz} />, () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 }))}
          <Divider />

          {btn("Bullet list",   <List className={sz} />,        () => editor.chain().focus().toggleBulletList().run(),  editor.isActive("bulletList"))}
          {btn("Ordered list",  <ListOrdered className={sz} />, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"))}
          {btn("Task list",     <ListChecks className={sz} />,  () => editor.chain().focus().toggleTaskList().run(),    editor.isActive("taskList"))}
          <Divider />

          {btn("Blockquote",   <Quote className={sz} />, () => editor.chain().focus().toggleBlockquote().run(),   editor.isActive("blockquote"))}
          {btn("Code block",   <Code2 className={sz} />, () => editor.chain().focus().toggleCodeBlock().run(),    editor.isActive("codeBlock"))}
          {btn("Divider line", <Minus className={sz} />, () => editor.chain().focus().setHorizontalRule().run())}
        </div>

        {/* ── Editor ───────────────────────────────────────────────────────── */}
        <EditorContent
          editor={editor}
          className={cn("flex-1 px-5 py-4", editorClassName)}
        />
      </div>

      {/* ── Mention popup — absolute inside relative wrapper, escapes overflow-hidden */}
      {mentionPopup.active && mentionPopup.items.length > 0 && (
        <div className="absolute z-[9999]" style={popupAbsoluteStyle}>
          <MentionSuggestion
            items={mentionPopup.items}
            selectedIndex={mentionPopup.selectedIndex}
            onSelect={handleMentionSelect}
          />
        </div>
      )}
    </div>
  )
}

// ── Read-only prose renderer ──────────────────────────────────────────────────

interface RichTextContentProps {
  html: string
  className?: string
}

/** Renders previously-saved HTML from the editor with matching prose styles. */
export function RichTextContent({ html, className }: RichTextContentProps) {
  if (!html) return null
  return (
    <div
      className={cn("meridian-editor", className)}
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(html, {
          ADD_ATTR: ["data-type", "data-id", "data-label"],
        }),
      }}
    />
  )
}
