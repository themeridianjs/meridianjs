import { useState } from "react"
import { useCreateProjectStatus } from "@/api/hooks/useProjectStatuses"
import type { ProjectStatus } from "@/api/hooks/useProjectStatuses"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const PRESET_COLORS = [
  "#94a3b8", // slate
  "#64748b", // gray
  "#6366f1", // indigo
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#3b82f6", // blue
  "#8b5cf6", // violet
]

const CATEGORY_OPTIONS: { value: ProjectStatus["category"]; label: string }[] = [
  { value: "backlog",    label: "Backlog" },
  { value: "unstarted",  label: "Not Started" },
  { value: "started",    label: "In Progress" },
  { value: "completed",  label: "Done" },
  { value: "cancelled",  label: "Cancelled" },
]

interface CreateStatusDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
}

export function CreateStatusDialog({ open, onClose, projectId }: CreateStatusDialogProps) {
  const [name, setName] = useState("")
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [customColor, setCustomColor] = useState("")
  const [category, setCategory] = useState<ProjectStatus["category"]>("started")

  const createStatus = useCreateProjectStatus(projectId)

  const activeColor = customColor || color

  const handleSubmit = () => {
    if (!name.trim()) return
    createStatus.mutate(
      { name: name.trim(), color: activeColor, category },
      {
        onSuccess: () => {
          toast.success("Status created")
          setName("")
          setColor(PRESET_COLORS[0])
          setCustomColor("")
          setCategory("started")
          onClose()
        },
        onError: () => toast.error("Failed to create status"),
      }
    )
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="sm:max-w-sm">
        <DrawerHeader>
          <DrawerTitle className="text-sm font-medium">New Status</DrawerTitle>
        </DrawerHeader>

        <DrawerBody>
        <div className="space-y-4">
          {/* Name */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Name</p>
            <Input
              placeholder="e.g. In Review"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
              className="h-8 text-sm"
            />
          </div>

          {/* Color swatches */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Color</p>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setCustomColor("") }}
                  className={cn(
                    "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                    color === c && !customColor
                      ? "border-foreground scale-110"
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
              {/* Custom hex input */}
              <div className="flex items-center gap-1.5 ml-1">
                <div
                  className="h-6 w-6 rounded-full border border-border shrink-0"
                  style={{ backgroundColor: customColor || "#e5e7eb" }}
                />
                <Input
                  placeholder="#hex"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="h-6 w-20 text-xs px-1.5"
                />
              </div>
            </div>
          </div>

          {/* Category */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Category</p>
            <Select value={category} onValueChange={(v) => setCategory(v as ProjectStatus["category"])}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
          </Select>
        </div>
        </div>
        </DrawerBody>

        <DrawerFooter className="mt-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!name.trim() || createStatus.isPending}
            className="text-xs"
          >
            Create
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
