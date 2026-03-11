import type { Response } from "express"
import { requireRoles } from "@meridianjs/auth"

export const GET = async (req: any, res: Response) => {
  requireRoles("super-admin", "admin")(req, res, async () => {
    const invitationService = req.scope.resolve("invitationModuleService") as any
    const workspaceService  = req.scope.resolve("workspaceModuleService") as any

    const limit = Math.min(Number(req.query.limit) || 20, 100)
    const offset = Number(req.query.offset) || 0
    const q = typeof req.query.q === "string" ? req.query.q.trim() : ""

    const filters: Record<string, unknown> = { status: "pending" }
    if (q) {
      filters.email = { $ilike: `%${q}%` }
    }

    const [invitations, totalCount] = await invitationService.listAndCountInvitations(filters, { limit, offset })

    // Enrich with workspace name where applicable
    const workspaceCache = new Map<string, string>()
    const enriched = await Promise.all(
      (invitations as any[]).map(async (inv: any) => {
        let workspace_name: string | null = null
        if (inv.workspace_id) {
          if (!workspaceCache.has(inv.workspace_id)) {
            try {
              const ws = await workspaceService.retrieveWorkspace(inv.workspace_id)
              workspaceCache.set(inv.workspace_id, ws.name)
            } catch {
              workspaceCache.set(inv.workspace_id, inv.workspace_id)
            }
          }
          workspace_name = workspaceCache.get(inv.workspace_id) ?? null
        }
        return {
          id: inv.id,
          email: inv.email,
          role: inv.role,
          status: inv.status,
          token: inv.token,
          workspace_id: inv.workspace_id ?? null,
          workspace_name,
          expires_at: inv.expires_at ?? null,
          created_at: inv.created_at,
        }
      })
    )

    res.json({ invitations: enriched, count: totalCount, limit, offset })
  })
}
