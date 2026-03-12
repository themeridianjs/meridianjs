import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"

export const POST = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("member:invite")(req, res, async () => {
    try {
      const workspaceService = req.scope.resolve("workspaceModuleService") as any
      const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any

      const workspace = await workspaceService.retrieveWorkspace(req.params.id)
      if (!workspace) {
        res.status(404).json({ error: { message: "Workspace not found" } })
        return
      }

      const roles: string[] = req.user?.roles ?? []
      const isPrivileged = roles.includes("super-admin") || roles.includes("admin")

      if (workspace.is_private || !isPrivileged) {
        const membership = await workspaceMemberService.getMembership(req.params.id, req.user?.id)
        if (!membership) {
          res.status(403).json({ error: { message: "Forbidden — not a member of this workspace" } })
          return
        }
      }

      const { user_ids, role, app_role_id } = req.body

      if (!Array.isArray(user_ids) || user_ids.length === 0) {
        res.status(400).json({ error: { message: "user_ids must be a non-empty array" } })
        return
      }

      const wsRole: "admin" | "member" = role === "member" ? "member" : "admin"
      let added = 0
      let skipped = 0

      for (const userId of user_ids) {
        const existing = await workspaceMemberService.getMembership(req.params.id, userId)
        if (existing) {
          skipped++
          continue
        }

        await workspaceMemberService.createWorkspaceMember({
          workspace_id: req.params.id,
          user_id: userId,
          role: wsRole,
        })
        added++

        const eventBus = req.scope.resolve("eventBus") as any
        eventBus.emit({
          name: "workspace.member_added",
          data: {
            workspace_id: req.params.id,
            user_id: userId,
            role: wsRole,
            actor_id: req.user?.id ?? "system",
          },
        }).catch(() => {})
      }

      // Optionally assign custom app role to all added users
      if (app_role_id) {
        try {
          const userService = req.scope.resolve("userModuleService") as any
          for (const userId of user_ids) {
            await userService.updateUser(userId, { app_role_id }).catch(() => {})
          }
        } catch {
          // Non-fatal
        }
      }

      res.status(201).json({ added, skipped })
    } catch (err) {
      next(err)
    }
  })
}
