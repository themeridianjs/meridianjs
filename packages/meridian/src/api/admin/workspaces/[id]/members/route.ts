import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"
import { assertWorkspaceAccess } from "../../../../utils/workspace-access.js"
import { assignDefaultUserRole } from "../../../../utils/assign-default-role.js"
import { EVENTS, ROLES } from "@meridianjs/types"

export const GET = async (req: any, res: Response) => {
  if (!await assertWorkspaceAccess(req, res)) return

  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
  const userService = req.scope.resolve("userModuleService") as any

  const [members] = await workspaceMemberService.listAndCountWorkspaceMembers(
    { workspace_id: req.params.id },
    { limit: 100 }
  )

  // Batch-fetch all users in a single query instead of N individual lookups
  const userMap = await userService.listUsersByIds(members.map((m: any) => m.user_id))

  const enriched = members.map((m: any) => {
    const user = userMap.get(m.user_id) ?? null
    if (!user) return null
    return {
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      app_role_id: user.app_role_id ?? null,
      user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name },
    }
  }).filter(Boolean)

  res.json({ members: enriched, count: enriched.length })
}

export const POST = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("member:invite")(req, res, async () => {
    try {
      if (!await assertWorkspaceAccess(req, res)) return

      const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
      const { user_id, role, app_role_id } = req.body

      if (!user_id) {
        res.status(400).json({ error: { message: "user_id is required" } })
        return
      }

      const userService = req.scope.resolve("userModuleService") as any
      const targetUser = await userService.retrieveUser(user_id).catch(() => null)
      if (!targetUser) {
        res.status(404).json({ error: { message: "User not found" } })
        return
      }

      const existing = await workspaceMemberService.getMembership(req.params.id, user_id)
      if (existing) {
        res.status(409).json({ error: { message: "User is already a member of this workspace" } })
        return
      }

      // workspace_member.role only supports "admin" | "member" — map super-admin → admin
      const wsRole: "admin" | "member" = role === ROLES.MEMBER ? ROLES.MEMBER : ROLES.ADMIN

      const member = await workspaceMemberService.createWorkspaceMember({
        workspace_id: req.params.id,
        user_id,
        role: wsRole,
      })

      await assignDefaultUserRole(req, user_id, app_role_id)

      const eventBus = req.scope.resolve("eventBus") as any
      eventBus.emit({
        name: EVENTS.WORKSPACE_MEMBER_ADDED,
        data: {
          workspace_id: req.params.id,
          user_id,
          role: wsRole,
          actor_id: req.user?.id ?? "system",
        },
      }).catch(() => {})

      res.status(201).json({ member })
    } catch (err) {
      next(err)
    }
  })
}
