import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"

async function assertWorkspaceAccess(req: any, res: Response): Promise<boolean> {
  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any

  const workspace = await workspaceService.retrieveWorkspace(req.params.id)
  const roles: string[] = req.user?.roles ?? []
  const isPrivileged = roles.includes("super-admin") || roles.includes("admin")

  if (workspace?.is_private || !isPrivileged) {
    const membership = await workspaceMemberService.getMembership(req.params.id, req.user?.id)
    if (!membership) {
      res.status(403).json({ error: { message: "Forbidden — not a member of this workspace" } })
      return false
    }
  }
  return true
}

export const DELETE = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("team:manage_members")(req, res, async () => {
    try {
      if (!await assertWorkspaceAccess(req, res)) return

      const teamMemberService = req.scope.resolve("teamMemberModuleService") as any
      await teamMemberService.removeByTeamAndUser(req.params.teamId, req.params.userId)
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  })
}
