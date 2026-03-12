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

async function assertTeamBelongsToWorkspace(req: any, res: Response): Promise<boolean> {
  const userService = req.scope.resolve("userModuleService") as any
  const team = await userService.retrieveTeam(req.params.teamId)
  if (!team || team.workspace_id !== req.params.id) {
    res.status(404).json({ error: { message: "Team not found in this workspace" } })
    return false
  }
  return true
}

export const GET = async (req: any, res: Response) => {
  if (!await assertWorkspaceAccess(req, res)) return
  if (!await assertTeamBelongsToWorkspace(req, res)) return

  const teamMemberService = req.scope.resolve("teamMemberModuleService") as any
  const userService = req.scope.resolve("userModuleService") as any

  const [members] = await teamMemberService.listAndCountTeamMembers(
    { team_id: req.params.teamId },
    { limit: 100 }
  )

  // Batch-fetch all users in a single query instead of N individual lookups (#11)
  const userMap = await userService.listUsersByIds(members.map((m: any) => m.user_id))

  const enriched = members.map((m: any) => {
    const user = userMap.get(m.user_id) ?? null
    return {
      id: m.id,
      user_id: m.user_id,
      user: user ? { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name } : null,
    }
  })

  res.json({ members: enriched, count: enriched.length })
}

export const POST = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("team:manage_members")(req, res, async () => {
    try {
      if (!await assertWorkspaceAccess(req, res)) return
      if (!await assertTeamBelongsToWorkspace(req, res)) return

      const teamMemberService = req.scope.resolve("teamMemberModuleService") as any
      const { user_id } = req.body

      if (!user_id) {
        res.status(400).json({ error: { message: "user_id is required" } })
        return
      }

      if (await teamMemberService.isMember(req.params.teamId, user_id)) {
        res.status(409).json({ error: { message: "User is already a member of this team" } })
        return
      }

      const member = await teamMemberService.createTeamMember({
        team_id: req.params.teamId,
        user_id,
      })

      res.status(201).json({ member })
    } catch (err) {
      next(err)
    }
  })
}
