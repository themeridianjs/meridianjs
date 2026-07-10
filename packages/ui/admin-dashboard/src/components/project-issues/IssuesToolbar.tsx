import { useState } from "react"
import { useCreateTaskList } from "@/api/hooks/useTaskLists"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus } from "lucide-react"
import { toast } from "sonner"

interface IssuesToolbarProps {
  projectId: string
  onCreateIssue: () => void
}

/** Card header actions: "New List" inline form + "Create" issue button. */
export function IssuesToolbar({ projectId, onCreateIssue }: IssuesToolbarProps) {
  const [newListName, setNewListName] = useState("")
  const [showNewListInput, setShowNewListInput] = useState(false)
  const createTaskList = useCreateTaskList(projectId)

  function handleCreateList() {
    if (!newListName.trim()) return
    createTaskList.mutate(
      { name: newListName.trim() },
      {
        onSuccess: () => { setNewListName(""); setShowNewListInput(false); toast.success("List created") },
        onError: () => toast.error("Failed to create list"),
      }
    )
  }

  return (
    <div className="flex items-center justify-end px-6 py-3 border-b border-border">
      <div className="flex items-center gap-2">
        {/* New list */}
        {showNewListInput ? (
          <div className="flex items-center gap-1.5">
            <Input
              autoFocus
              placeholder="List name..."
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateList()
                if (e.key === "Escape") { setShowNewListInput(false); setNewListName("") }
              }}
              className="h-8 text-xs w-36"
            />
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleCreateList} disabled={!newListName.trim() || createTaskList.isPending}>
              Add
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowNewListInput(false); setNewListName("") }}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setShowNewListInput(true)}>
            <Plus className="h-4 w-4" />
            New List
          </Button>
        )}
        <Button size="sm" onClick={onCreateIssue}>
          <Plus className="h-4 w-4" />
          Create
        </Button>
      </div>
    </div>
  )
}
