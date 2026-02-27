import { useState } from "react"
import type { ZonePropMap } from "@/lib/widget-registry"
import { useUpdateIssue } from "@/api/hooks/useIssues"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Database, Plus, Trash2 } from "lucide-react"

type Props = ZonePropMap["issue.details.after"]

export function MetadataWidget({ issue }: Props) {
  const updateIssue = useUpdateIssue(issue.id, issue.project_id)
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [adding, setAdding] = useState(false)

  const metadata = (issue.metadata ?? {}) as Record<string, unknown>
  const entries = Object.entries(metadata)

  const handleAdd = () => {
    if (!newKey.trim()) return
    const updated = { ...metadata, [newKey.trim()]: newValue }
    updateIssue.mutate(
      { metadata: updated },
      {
        onSuccess: () => {
          toast.success("Metadata saved")
          setNewKey("")
          setNewValue("")
          setAdding(false)
        },
        onError: () => toast.error("Failed to save metadata"),
      }
    )
  }

  const handleDelete = (key: string) => {
    const updated = { ...metadata }
    delete updated[key]
    updateIssue.mutate(
      { metadata: Object.keys(updated).length ? updated : null },
      {
        onSuccess: () => toast.success("Entry removed"),
        onError: () => toast.error("Failed to update metadata"),
      }
    )
  }

  return (
    <div className="bg-white dark:bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Metadata
          </p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add field
          </button>
        )}
      </div>

      <div className="px-5 py-3 space-y-2">
        {entries.length === 0 && !adding && (
          <p className="text-xs text-muted-foreground/50 italic">No metadata fields yet</p>
        )}

        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2 group">
            <span className="text-xs font-mono text-muted-foreground w-28 shrink-0 truncate">{key}</span>
            <span className="text-xs text-foreground flex-1 truncate">{String(value)}</span>
            <button
              onClick={() => handleDelete(key)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}

        {adding && (
          <div className="flex items-center gap-2 pt-1">
            <Input
              autoFocus
              placeholder="key"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false) }}
              className="h-7 text-xs font-mono w-28 shrink-0"
            />
            <Input
              placeholder="value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false) }}
              className="h-7 text-xs flex-1"
            />
            <Button
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleAdd}
              disabled={!newKey.trim() || updateIssue.isPending}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => { setAdding(false); setNewKey(""); setNewValue("") }}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
