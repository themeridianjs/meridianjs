import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"

export const GET = async (req: any, res: Response) => {
  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const offset = Number(req.query.offset) || 0

  const roles: string[] = req.user?.roles ?? []
  const isPrivileged = roles.includes("super-admin") || roles.includes("admin")

  if (isPrivileged) {
    const [workspaces, count] = await workspaceService.listAndCountWorkspaces({}, { limit, offset })
    res.json({ workspaces, count, limit, offset })
    return
  }

  // Members: filter to workspaces they belong to
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
  const workspaceIds = await workspaceMemberService.getWorkspaceIdsForUser(req.user.id)

  if (workspaceIds.length === 0) {
    res.json({ workspaces: [], count: 0, limit, offset })
    return
  }

  const [workspaces, count] = await workspaceService.listAndCountWorkspaces(
    { id: workspaceIds },
    { limit, offset }
  )
  res.json({ workspaces, count, limit, offset })
}

export const POST = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("workspace:create")(req, res, async () => {
    try {
      const workspaceService = req.scope.resolve("workspaceModuleService") as any
      const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
      const { name, plan } = req.body

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        res.status(400).json({ error: { message: "name is required" } })
        return
      }

      const slug = workspaceService.generateSlug(name.trim())
      const workspace = await workspaceService.createWorkspace({
        name: name.trim(),
        slug,
        plan: plan ?? "free",
      })

      // Auto-create workspace membership for the creator (admin role)
      if (req.user?.id) {
        await workspaceMemberService.ensureMember(workspace.id, req.user.id, "admin")
      }

      res.status(201).json({ workspace })
    } catch (err) {
      next(err)
    }
  })
}
