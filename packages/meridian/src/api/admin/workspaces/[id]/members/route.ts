import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"

export const GET = async (req: any, res: Response) => {
  // Authorization: super-admin/admin see all; members must belong to this workspace
  const roles: string[] = req.user?.roles ?? []
  if (!roles.includes("super-admin") && !roles.includes("admin")) {
    const workspaceMemberService0 = req.scope.resolve("workspaceMemberModuleService") as any
    const membership = await workspaceMemberService0.getMembership(req.params.id, req.user?.id)
    if (!membership) {
      res.status(403).json({ error: { message: "Forbidden — not a member of this workspace" } })
      return
    }
  }

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
      const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
      const { user_id, role, app_role_id } = req.body

      if (!user_id) {
        res.status(400).json({ error: { message: "user_id is required" } })
        return
      }

      const existing = await workspaceMemberService.getMembership(req.params.id, user_id)
      if (existing) {
        res.status(409).json({ error: { message: "User is already a member of this workspace" } })
        return
      }

      // workspace_member.role only supports "admin" | "member" — map super-admin → admin
      const wsRole: "admin" | "member" = role === "member" ? "member" : "admin"

      const member = await workspaceMemberService.createWorkspaceMember({
        workspace_id: req.params.id,
        user_id,
        role: wsRole,
      })

      // Optionally assign custom app role to the user
      if (app_role_id) {
        try {
          const userService = req.scope.resolve("userModuleService") as any
          await userService.updateUser(user_id, { app_role_id })
        } catch {
          // Non-fatal
        }
      }

      const eventBus = req.scope.resolve("eventBus") as any
      eventBus.emit({
        name: "workspace.member_added",
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
