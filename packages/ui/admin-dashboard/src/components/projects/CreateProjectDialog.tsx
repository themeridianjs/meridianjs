import { useState, useEffect } from "react"
import {
  useCreateProject,
  useSuggestProjectIdentifier,
  useCheckProjectIdentifier,
} from "@/api/hooks/useProjects"
import { useAuth } from "@/stores/auth"
import { ApiError } from "@/api/client"
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerBody,
  DrawerFooter,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { ChevronDown, ChevronRight, X, Plus, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────────

interface StatusChip {
  key: string
  name: string
  color: string
  category: "backlog" | "unstarted" | "started" | "completed" | "cancelled"
  position: number
}

const DEFAULT_STATUSES: StatusChip[] = [
  { name: "Backlog",     key: "backlog",      color: "#94a3b8", category: "backlog",    position: 0 },
  { name: "Todo",        key: "todo",         color: "#64748b", category: "unstarted",  position: 1 },
  { name: "In Progress", key: "in_progress",  color: "#6366f1", category: "started",    position: 2 },
  { name: "In Review",   key: "in_review",    color: "#f59e0b", category: "started",    position: 3 },
  { name: "Done",        key: "done",         color: "#10b981", category: "completed",  position: 4 },
  { name: "Cancelled",   key: "cancelled",    color: "#9ca3af", category: "cancelled",  position: 5 },
]

const PRESET_COLORS = ["#94a3b8", "#64748b", "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6"]

function toKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
}

// ── Sortable chip ──────────────────────────────────────────────────────────────

function SortableChip({ chip, onRemove }: { chip: StatusChip; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chip.key })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-1 pl-1 pr-1.5 py-0.5 rounded-full border text-xs font-medium transition-opacity",
        isDragging ? "opacity-50" : "opacity-100"
      )}
    >
      <span
        {...attributes}
        {...listeners}
        className="text-muted-foreground/50 hover:text-muted-foreground cursor-grab touch-none"
      >
        <GripVertical className="h-3 w-3" />
      </span>
      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: chip.color }} />
      <span className="text-[11px]">{chip.name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

// ── Main dialog ────────────────────────────────────────────────────────────────

interface CreateProjectDialogProps {
  open: boolean
  onClose: () => void
}

const MIN_IDENTIFIER_LENGTH = 3

export function CreateProjectDialog({ open, onClose }: CreateProjectDialogProps) {
  const [name, setName] = useState("")
  const [identifier, setIdentifier] = useState("")
  const [description, setDescription] = useState("")
  const [identifierTouched, setIdentifierTouched] = useState(false)
  const [statusesExpanded, setStatusesExpanded] = useState(false)
  const [statuses, setStatuses] = useState<StatusChip[]>(DEFAULT_STATUSES)
  const [newStatusName, setNewStatusName] = useState("")
  const [newStatusColor, setNewStatusColor] = useState(PRESET_COLORS[2])
  const { workspace } = useAuth()
  const createProject = useCreateProject()

  const suggestQuery = useSuggestProjectIdentifier(name, { enabled: open })
  const checkIdentifier = useCheckProjectIdentifier(identifier, { enabled: open })

  // When suggestion returns and user hasn't edited identifier, sync it
  useEffect(() => {
    if (open && suggestQuery.data && !identifierTouched) {
      setIdentifier(suggestQuery.data)
    }
  }, [open, suggestQuery.data, identifierTouched])

  const keyTaken =
    checkIdentifier.available === false ||
    (createProject.isError && (createProject.error as ApiError)?.status === 409)
  const identifierValid =
    identifier.trim().length >= MIN_IDENTIFIER_LENGTH &&
    /^[A-Z0-9]+$/i.test(identifier.trim())

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleNameChange = (v: string) => {
    setName(v)
    // Identifier is driven by useSuggestProjectIdentifier when !identifierTouched
  }

  // When user leaves the name field, flush the debounce so the suggestion
  // fires immediately for the current name rather than a stale debounced value.
  const handleNameBlur = () => {
    if (name.trim() && !identifierTouched) suggestQuery.flush()
  }

  const handleClose = () => {
    setName("")
    setIdentifier("")
    setDescription("")
    setIdentifierTouched(false)
    setStatusesExpanded(false)
    setStatuses(DEFAULT_STATUSES)
    setNewStatusName("")
    setNewStatusColor(PRESET_COLORS[2])
    createProject.reset()
    onClose()
  }

  const handleAddStatus = () => {
    if (!newStatusName.trim()) return
    const key = toKey(newStatusName.trim())
    if (statuses.some((s) => s.key === key)) {
      toast.error("A status with this name already exists")
      return
    }
    setStatuses((prev) => [
      ...prev,
      { name: newStatusName.trim(), key, color: newStatusColor, category: "started", position: prev.length },
    ])
    setNewStatusName("")
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setStatuses((prev) => {
      const oldIndex = prev.findIndex((s) => s.key === active.id)
      const newIndex = prev.findIndex((s) => s.key === over.id)
      return arrayMove(prev, oldIndex, newIndex).map((s, i) => ({ ...s, position: i }))
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !identifier.trim() || !identifierValid || keyTaken) return
    createProject.mutate(
      {
        name: name.trim(),
        identifier: identifier.trim().toUpperCase(),
        description: description.trim() || undefined,
        workspace_id: workspace!.id,
        initial_statuses: statuses,
      } as any,
      {
        onSuccess: () => {
          toast.success("Project created")
          handleClose()
        },
        onError: (err) => {
          const is409 = (err as ApiError)?.status === 409
          if (is409) toast.error("This project key is already in use.")
          else toast.error(err.message ?? "Failed to create project")
        },
      }
    )
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && handleClose()}>
      <DrawerContent className="max-w-md">
        <DrawerHeader>
          <DrawerTitle>New project</DrawerTitle>
        </DrawerHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <DrawerBody className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              placeholder="My Project"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={handleNameBlur}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Project key below will auto-fill when you finish typing; you can change it.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-id">
              Identifier
              <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                Used as issue prefix (e.g. PROJ-1)
              </span>
            </Label>
            <Input
              id="project-id"
              placeholder="PROJ"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                setIdentifierTouched(true)
              }}
              maxLength={5}
              className={cn("font-mono", keyTaken && "border-destructive")}
              aria-invalid={keyTaken}
            />
            {keyTaken && (
              <p className="text-xs text-destructive">This project key is already in use.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-desc">
              Description
              <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                Optional
              </span>
            </Label>
            <Textarea
              id="project-desc"
              placeholder="What is this project about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Statuses section */}
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setStatusesExpanded(!statusesExpanded)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium hover:bg-muted/40 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                {statusesExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                Statuses
                <span className="text-muted-foreground font-normal">({statuses.length})</span>
              </span>
            </button>

            {statusesExpanded && (
              <div className="px-3 pb-3 border-t border-border space-y-3 pt-3">
                {/* Chips */}
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                  <SortableContext items={statuses.map((s) => s.key)} strategy={horizontalListSortingStrategy}>
                    <div className="flex flex-wrap gap-1.5">
                      {statuses.map((s) => (
                        <SortableChip
                          key={s.key}
                          chip={s}
                          onRemove={() => setStatuses((prev) => prev.filter((x) => x.key !== s.key).map((x, i) => ({ ...x, position: i })))}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {/* Add new status inline */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 shrink-0">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewStatusColor(c)}
                        className={cn(
                          "h-4 w-4 rounded-full border-2 transition-transform hover:scale-110",
                          newStatusColor === c ? "border-foreground scale-110" : "border-transparent"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 flex-1">
                    <Input
                      placeholder="Status name…"
                      value={newStatusName}
                      onChange={(e) => setNewStatusName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddStatus() } }}
                      className="h-7 text-xs flex-1"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={handleAddStatus}
                      disabled={!newStatusName.trim()}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          </DrawerBody>

          <DrawerFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !name.trim() ||
                !identifier.trim() ||
                !identifierValid ||
                keyTaken ||
                createProject.isPending
              }
            >
              {createProject.isPending ? "Creating..." : "Create project"}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
