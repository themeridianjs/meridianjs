import DOMPurify from "dompurify"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Placeholder from "@tiptap/extension-placeholder"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import { cn } from "@/lib/utils"
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Heading1, Heading2, Heading3,
  List, ListOrdered, ListChecks,
  Quote, Code2, Minus,
  Undo2, Redo2,
} from "lucide-react"

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
}

export function RichTextEditor({
  content = "",
  onChange,
  placeholder = "Add a description…",
  className,
  toolbarClassName,
  editorClassName,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
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

  return (
    <div className={cn("flex flex-col overflow-hidden", className)}>
      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
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

      {/* ── Editor ─────────────────────────────────────────────────────────── */}
      <EditorContent
        editor={editor}
        className={cn("flex-1 px-5 py-4", editorClassName)}
      />
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
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  )
}
