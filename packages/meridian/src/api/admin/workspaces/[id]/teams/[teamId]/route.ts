import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"

async function assertWorkspaceAccess(req: any, res: Response): Promise<boolean> {
  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any

  const workspace = await workspaceService.retrieveWorkspace(req.params.id)
  if (!workspace) {
    res.status(404).json({ error: { message: "Workspace not found" } })
    return false
  }

  const roles: string[] = req.user?.roles ?? []
  const isPrivileged = roles.includes("super-admin") || roles.includes("admin")

  if (workspace.is_private || !isPrivileged) {
    const membership = await workspaceMemberService.getMembership(req.params.id, req.user?.id)
    if (!membership) {
      res.status(403).json({ error: { message: "Forbidden — not a member of this workspace" } })
      return false
    }
  }
  return true
}

async function assertTeamBelongsToWorkspace(req: any, res: Response): Promise<any | null> {
  const userService = req.scope.resolve("userModuleService") as any
  const team = await userService.retrieveTeam(req.params.teamId)
  if (!team || team.workspace_id !== req.params.id) {
    res.status(404).json({ error: { message: "Team not found in this workspace" } })
    return null
  }
  return team
}

export const GET = async (req: any, res: Response) => {
  if (!await assertWorkspaceAccess(req, res)) return
  const team = await assertTeamBelongsToWorkspace(req, res)
  if (!team) return
  res.json({ team })
}

export const PUT = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("team:update")(req, res, async () => {
    try {
      if (!await assertWorkspaceAccess(req, res)) return
      if (!await assertTeamBelongsToWorkspace(req, res)) return

      const userService = req.scope.resolve("userModuleService") as any
      const { name, description, icon } = req.body
      const updates: Record<string, unknown> = {}
      if (name !== undefined) updates.name = name.trim()
      if (description !== undefined) updates.description = description
      if (icon !== undefined) updates.icon = icon

      const team = await userService.updateTeam(req.params.teamId, updates)
      res.json({ team })
    } catch (err) {
      next(err)
    }
  })
}

export const DELETE = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("team:delete")(req, res, async () => {
    try {
      if (!await assertWorkspaceAccess(req, res)) return
      if (!await assertTeamBelongsToWorkspace(req, res)) return

      const userService = req.scope.resolve("userModuleService") as any
      const teamMemberService = req.scope.resolve("teamMemberModuleService") as any

      await teamMemberService.deleteAllForTeam(req.params.teamId)
      await userService.deleteTeam(req.params.teamId)
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  })
}
