import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"

export const GET = async (req: any, res: Response) => {
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
  const userService = req.scope.resolve("userModuleService") as any

  const [members] = await workspaceMemberService.listAndCountWorkspaceMembers(
    { workspace_id: req.params.id },
    { limit: 100 }
  )

  const enriched = await Promise.all(
    members.map(async (m: any) => {
      try {
        const user = await userService.retrieveUser(m.user_id)
        return {
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          app_role_id: user.app_role_id ?? null,
          user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name },
        }
      } catch {
        return { id: m.id, user_id: m.user_id, role: m.role, app_role_id: null, user: null }
      }
    })
  )

  res.json({ members: enriched, count: enriched.length })
}

export const POST = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("member:invite")(req, res, async () => {
    try {
      const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
      const { user_id, role } = req.body

      if (!user_id) {
        res.status(400).json({ error: { message: "user_id is required" } })
        return
      }

      const existing = await workspaceMemberService.getMembership(req.params.id, user_id)
      if (existing) {
        res.status(409).json({ error: { message: "User is already a member of this workspace" } })
        return
      }

      const member = await workspaceMemberService.createWorkspaceMember({
        workspace_id: req.params.id,
        user_id,
        role: role ?? "member",
      })

      res.status(201).json({ member })
    } catch (err) {
      next(err)
    }
  })
}
