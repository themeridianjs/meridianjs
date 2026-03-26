import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
  const workspaceService = req.scope.resolve("workspaceModuleService") as any

  const userId: string = req.user?.id
  const requests = await workspaceMemberService.getUserPendingRequests(userId)

  const enriched = await Promise.all(
    requests.map(async (r: any) => {
      const workspace = await workspaceService.retrieveWorkspace(r.workspace_id).catch(() => null)
      return {
        id: r.id,
        workspace_id: r.workspace_id,
        workspace_name: workspace?.name ?? null,
        workspace_slug: workspace?.slug ?? null,
        message: r.message,
        status: r.status,
        created_at: r.created_at,
      }
    })
  )

  res.json({ requests: enriched })
}
