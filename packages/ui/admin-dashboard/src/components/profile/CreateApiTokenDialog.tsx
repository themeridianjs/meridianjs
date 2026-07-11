import { useState } from "react"
import { useCreateApiToken } from "@/api/hooks/useApiTokens"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Copy, Check, TriangleAlert } from "lucide-react"

const EXPIRY_OPTIONS = [
  { value: "never", label: "Never expires" },
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
]

interface CreateApiTokenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateApiTokenDialog({ open, onOpenChange }: CreateApiTokenDialogProps) {
  const createToken = useCreateApiToken()
  const [name, setName] = useState("")
  const [write, setWrite] = useState(true)
  const [expiry, setExpiry] = useState("never")
  // Set once after a successful create — switches the dialog to the one-time reveal.
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const reset = () => {
    setName("")
    setWrite(true)
    setExpiry("never")
    setCreatedToken(null)
    setCopied(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Give the token a name")
      return
    }
    try {
      const { token } = await createToken.mutateAsync({
        name: name.trim(),
        scopes: write ? ["read", "write"] : ["read"],
        expires_in_days: expiry === "never" ? null : Number(expiry),
      })
      setCreatedToken(token)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create token")
    }
  }

  const handleCopy = async () => {
    if (!createdToken) return
    await navigator.clipboard.writeText(createdToken)
    setCopied(true)
    toast.success("Token copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {createdToken ? (
          <>
            <DialogHeader>
              <DialogTitle>Token created</DialogTitle>
              <DialogDescription>
                Copy your token now — for security it will never be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={createdToken}
                  className="font-mono text-xs"
                  onFocus={(e) => e.target.select()}
                />
                <Button variant="outline" size="icon" className="shrink-0" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Treat this token like a password. Anyone holding it can act as you
                  {write ? " — including creating and editing tasks" : " (read-only)"}.
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create API token</DialogTitle>
              <DialogDescription>
                Use API tokens to connect Claude, Cursor, and other tools to Meridian — via the
                MCP endpoint or the REST API.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token-name">Name</Label>
                <Input
                  id="token-name"
                  placeholder="e.g. Claude Desktop"
                  value={name}
                  maxLength={100}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="flex items-center gap-2">
                  <Checkbox id="scope-read" checked disabled />
                  <Label htmlFor="scope-read" className="font-normal text-muted-foreground">
                    Read — list and search projects, tasks, and members
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="scope-write"
                    checked={write}
                    onCheckedChange={(v) => setWrite(v === true)}
                  />
                  <Label htmlFor="scope-write" className="font-normal">
                    Write — create and update tasks, add comments
                  </Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Expiration</Label>
                <Select value={expiry} onValueChange={setExpiry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createToken.isPending || !name.trim()}>
                {createToken.isPending ? "Creating…" : "Create token"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
