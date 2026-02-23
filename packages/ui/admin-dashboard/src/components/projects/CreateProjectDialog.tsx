import { useState } from "react"
import { useCreateProject } from "@/api/hooks/useProjects"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface CreateProjectDialogProps {
  open: boolean
  onClose: () => void
}

export function CreateProjectDialog({ open, onClose }: CreateProjectDialogProps) {
  const [name, setName] = useState("")
  const [identifier, setIdentifier] = useState("")
  const [description, setDescription] = useState("")
  const [identifierTouched, setIdentifierTouched] = useState(false)
  const createProject = useCreateProject()

  const handleNameChange = (v: string) => {
    setName(v)
    if (!identifierTouched) {
      // Auto-generate identifier from name: take first letters of each word, uppercase, max 5 chars
      const auto = v
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 5)
      setIdentifier(auto)
    }
  }

  const handleClose = () => {
    setName("")
    setIdentifier("")
    setDescription("")
    setIdentifierTouched(false)
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !identifier.trim()) return
    createProject.mutate(
      { name: name.trim(), identifier: identifier.trim().toUpperCase(), description: description.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Project created")
          handleClose()
        },
        onError: (err) => {
          toast.error(err.message ?? "Failed to create project")
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              placeholder="My Project"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              autoFocus
            />
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
              className="font-mono"
            />
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
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || !identifier.trim() || createProject.isPending}
            >
              {createProject.isPending ? "Creating..." : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
