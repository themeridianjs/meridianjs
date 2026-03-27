import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any

  const q = (req.query.q as string ?? "").trim().toLowerCase()

  const [workspaces] = await workspaceService.listAndCountWorkspaces(
    { is_private: false },
    { limit: 100 }
  )

  const filtered = q
    ? workspaces.filter(
        (w: any) =>
          w.name.toLowerCase().includes(q) ||
          w.slug.toLowerCase().includes(q)
      )
    : workspaces

  const limited = filtered.slice(0, 20)

  // Check membership and pending request for each workspace
  const results = await Promise.all(
    limited.map(async (w: any) => {
      const isMember = await workspaceMemberService.isMember(w.id, req.user?.id)
      const hasPendingRequest = !isMember
        ? !!(await workspaceMemberService.getPendingRequest(w.id, req.user?.id))
        : false
      return { id: w.id, name: w.name, slug: w.slug, is_private: w.is_private, is_member: isMember, has_pending_request: hasPendingRequest }
    })
  )

  res.json({ workspaces: results })
}
