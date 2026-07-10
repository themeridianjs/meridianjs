import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any

  const q = (req.query.q as string ?? "").trim()

  // Push the text search into SQL rather than loading 100 rows and filtering in JS.
  const filters: Record<string, unknown> = { is_private: false }
  if (q) {
    const term = `%${q}%`
    filters.$or = [{ name: { $ilike: term } }, { slug: { $ilike: term } }]
  }

  const [workspaces] = await workspaceService.listAndCountWorkspaces(filters, { limit: 20 })

  // Batch the membership + pending-request lookups into two queries total
  // instead of two per result row.
  const userId = req.user?.id
  const memberWsIds = new Set<string>(await workspaceMemberService.getWorkspaceIdsForUser(userId))
  const pendingWsIds = new Set<string>(
    (await workspaceMemberService.getUserPendingRequests(userId)).map((r: any) => r.workspace_id)
  )

  const results = workspaces.map((w: any) => {
    const isMember = memberWsIds.has(w.id)
    return {
      id: w.id,
      name: w.name,
      slug: w.slug,
      is_private: w.is_private,
      is_member: isMember,
      has_pending_request: !isMember && pendingWsIds.has(w.id),
    }
  })

  res.json({ workspaces: results, count: results.length })
}
