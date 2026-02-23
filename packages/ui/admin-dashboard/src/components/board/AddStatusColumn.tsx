import { useState } from "react"
import { Plus } from "lucide-react"
import { CreateStatusDialog } from "./CreateStatusDialog"

interface AddStatusColumnProps {
  projectId: string
}

export function AddStatusColumn({ projectId }: AddStatusColumnProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="flex flex-col min-w-[260px] max-w-[280px] w-full">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/30 transition-colors text-xs font-medium h-9"
        >
          <Plus className="h-3.5 w-3.5" />
          Add status
        </button>
      </div>

      <CreateStatusDialog
        open={open}
        onClose={() => setOpen(false)}
        projectId={projectId}
      />
    </>
  )
}
