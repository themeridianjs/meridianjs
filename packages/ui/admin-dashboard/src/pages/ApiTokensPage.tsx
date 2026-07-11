import { useState } from "react"
import { useApiTokens, useRevokeApiToken, type ApiToken } from "@/api/hooks/useApiTokens"
import { CreateApiTokenDialog } from "@/components/profile/CreateApiTokenDialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { KeyRound, Plus, Trash2 } from "lucide-react"

function formatDate(value: string | null): string {
  if (!value) return "—"
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function TokenRow({ token, onRevoke }: { token: ApiToken; onRevoke: (t: ApiToken) => void }) {
  const revoked = Boolean(token.revoked_at)
  const expired = token.expires_at ? new Date(token.expires_at) < new Date() : false
  return (
    <div className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{token.name}</span>
          {token.scopes.map((s) => (
            <Badge key={s} variant={s === "write" ? "default" : "secondary"} className="text-[10px]">
              {s}
            </Badge>
          ))}
          {revoked && (
            <Badge variant="destructive" className="text-[10px]">
              revoked
            </Badge>
          )}
          {!revoked && expired && (
            <Badge variant="outline" className="text-[10px]">
              expired
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
          <code className="font-mono">{token.token_prefix}…</code>
          <span>Created {formatDate(token.created_at)}</span>
          <span>Last used {formatDate(token.last_used_at)}</span>
          {token.expires_at && !expired && <span>Expires {formatDate(token.expires_at)}</span>}
        </div>
      </div>
      {!revoked && (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onRevoke(token)}
          title="Revoke token"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

export function ApiTokensPage() {
  const { data: tokens, isLoading } = useApiTokens()
  const revokeToken = useRevokeApiToken()
  const [createOpen, setCreateOpen] = useState(false)
  const [toRevoke, setToRevoke] = useState<ApiToken | null>(null)

  const handleRevoke = async () => {
    if (!toRevoke) return
    try {
      await revokeToken.mutateAsync(toRevoke.id)
      toast.success(`Token “${toRevoke.name}” revoked`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke token")
    } finally {
      setToRevoke(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">API Tokens</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Personal access tokens let LLM clients and scripts act as you — connect Claude, Cursor,
            or any MCP client to the <code className="font-mono text-xs">/mcp</code> endpoint, or
            call the REST API directly.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4" />
          New token
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : !tokens || tokens.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-14 text-center">
          <KeyRound className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-medium">No API tokens yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create one to connect Claude, Cursor, and other tools to Meridian.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create token
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          {tokens.map((token) => (
            <TokenRow key={token.id} token={token} onRevoke={setToRevoke} />
          ))}
        </div>
      )}

      <CreateApiTokenDialog open={createOpen} onOpenChange={setCreateOpen} />

      <AlertDialog open={Boolean(toRevoke)} onOpenChange={(open) => !open && setToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke “{toRevoke?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Anything using this token immediately loses access. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRevoke}
            >
              Revoke token
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
