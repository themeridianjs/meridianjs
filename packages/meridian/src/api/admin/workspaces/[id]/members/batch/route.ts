import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"
import { assertWorkspaceAccess } from "../../../../../utils/workspace-access.js"
import { assignDefaultUserRole } from "../../../../../utils/assign-default-role.js"
import { EVENTS, ROLES } from "@meridianjs/types"

export const POST = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("member:invite")(req, res, async () => {
    try {
      if (!await assertWorkspaceAccess(req, res)) return

      const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
      const { user_ids, role, app_role_id } = req.body

      if (!Array.isArray(user_ids) || user_ids.length === 0) {
        res.status(400).json({ error: { message: "user_ids must be a non-empty array" } })
        return
      }

      const wsRole: "admin" | "member" = role === ROLES.MEMBER ? ROLES.MEMBER : ROLES.ADMIN

      // Validate all user IDs exist before creating memberships
      const userService = req.scope.resolve("userModuleService") as any
      const userMap = await userService.listUsersByIds(user_ids)
      const invalidIds = user_ids.filter((id: string) => !userMap.has(id))
      if (invalidIds.length > 0) {
        res.status(404).json({ error: { message: `Users not found: ${invalidIds.join(", ")}` } })
        return
      }

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
          name: EVENTS.WORKSPACE_MEMBER_ADDED,
          data: {
            workspace_id: req.params.id,
            user_id: userId,
            role: wsRole,
            actor_id: req.user?.id ?? "system",
          },
        }).catch(() => {})
      }

      // Assign app roles
      for (const userId of user_ids) {
        await assignDefaultUserRole(req, userId, app_role_id)
      }

      res.status(201).json({ added, skipped })
    } catch (err) {
      next(err)
    }
  })
}
