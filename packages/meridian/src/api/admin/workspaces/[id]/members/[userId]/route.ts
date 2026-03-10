import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"

const ROLE_RANK: Record<string, number> = {
  "super-admin": 3,
  "admin": 2,
  "moderator": 1,
  "member": 0,
}

function actorRank(req: any): number {
  const roles: string[] = req.user?.roles ?? []
  return Math.max(...roles.map((r) => ROLE_RANK[r] ?? 0), 0)
}

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

export const PATCH = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("member:update_role")(req, res, async () => {
    try {
      if (!await assertWorkspaceAccess(req, res)) return

      const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
      const { role } = req.body

      if (!role || !["admin", "member"].includes(role)) {
        res.status(400).json({ error: { message: "role must be 'admin' or 'member'" } })
        return
      }

      const membership = await workspaceMemberService.getMembership(req.params.id, req.params.userId)
      if (!membership) {
        res.status(404).json({ error: { message: "Member not found" } })
        return
      }

      const actor = actorRank(req)
      const targetRank = ROLE_RANK[membership.role] ?? 0

      if (targetRank >= actor) {
        res.status(403).json({ error: { message: "You cannot change the role of a member at or above your level" } })
        return
      }

      if ((ROLE_RANK[role] ?? 0) >= actor) {
        res.status(403).json({ error: { message: "You cannot assign a role equal to or above your own" } })
        return
      }

      const updated = await workspaceMemberService.updateWorkspaceMember(membership.id, { role })
      res.json({ member: updated })
    } catch (err) {
      next(err)
    }
  })
}

export const DELETE = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("member:remove")(req, res, async () => {
    try {
      if (!await assertWorkspaceAccess(req, res)) return

      const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
      const projectService = req.scope.resolve("projectModuleService") as any
      const projectMemberService = req.scope.resolve("projectMemberModuleService") as any

      const membership = await workspaceMemberService.getMembership(req.params.id, req.params.userId)
      if (!membership) {
        res.status(404).json({ error: { message: "Member not found" } })
        return
      }

      const actor = actorRank(req)
      const targetRank = ROLE_RANK[membership.role] ?? 0

      if (targetRank >= actor) {
        res.status(403).json({ error: { message: "You cannot remove a member at or above your level" } })
        return
      }

      if (req.params.userId === req.user?.id) {
        res.status(400).json({ error: { message: "You cannot remove yourself" } })
        return
      }

      // Remove from all projects in this workspace
      const [projects] = await projectService.listAndCountProjects(
        { workspace_id: req.params.id },
        { limit: 1000 }
      )
      await Promise.all(
        projects.map((p: any) =>
          projectMemberService.removeProjectMember(p.id, req.params.userId).catch(() => {})
        )
      )

      await workspaceMemberService.deleteWorkspaceMember(membership.id)
      res.status(204).send()
    } catch (err) {
      next(err)
    }
  })
}
