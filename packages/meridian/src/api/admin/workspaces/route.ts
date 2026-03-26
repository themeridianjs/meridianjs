import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"

export const GET = async (req: any, res: Response) => {
  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
  const limit = Number(req.query.limit) || 200
  const offset = Number(req.query.offset) || 0

  const roles: string[] = req.user?.roles ?? []
  const isPrivileged = roles.includes("super-admin") || roles.includes("admin")

  // Always fetch the user's workspace memberships (needed for private workspace filtering)
  const userWorkspaceIds = await workspaceMemberService.getWorkspaceIdsForUser(req.user.id)

  if (isPrivileged) {
    const [workspaces, count] = await workspaceService.listAndCountWorkspaces({}, { limit, offset })
    // Super-admin org-scope bypass: return all workspaces unfiltered
    if (roles.includes("super-admin") && req.query.org_scope === "true") {
      res.json({ workspaces, count, limit, offset })
      return
    }
    // Exclude private workspaces the user is not a member of
    const memberSet = new Set(userWorkspaceIds)
    const filtered = workspaces.filter(
      (w: any) => !w.is_private || memberSet.has(w.id)
    )
    res.json({ workspaces: filtered, count: filtered.length, limit, offset })
    return
  }

  // Members: filter to workspaces they belong to
  if (userWorkspaceIds.length === 0) {
    res.json({ workspaces: [], count: 0, limit, offset })
    return
  }

  const [workspaces, count] = await workspaceService.listAndCountWorkspaces(
    { id: userWorkspaceIds },
    { limit, offset }
  )
  res.json({ workspaces, count, limit, offset })
}

export const POST = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("workspace:create")(req, res, async () => {
    try {
      const workspaceService = req.scope.resolve("workspaceModuleService") as any
      const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
      const { name, plan, is_private } = req.body

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        res.status(400).json({ error: { message: "name is required" } })
        return
      }

      const slug = workspaceService.generateSlug(name.trim())

      // Reject duplicate workspace slugs (same name resolves to same slug)
      const existing = await workspaceService.retrieveWorkspaceBySlug(slug)
      if (existing) {
        res.status(409).json({
          error: {
            message: `A workspace named "${existing.name}" already exists.`,
            code: "WORKSPACE_EXISTS",
            workspace: { id: existing.id, name: existing.name, slug: existing.slug },
          },
        })
        return
      }

      const workspace = await workspaceService.createWorkspace({
        name: name.trim(),
        slug,
        plan: plan ?? "free",
        is_private: is_private ?? false,
      })

      // Auto-create workspace membership for the creator (admin role)
      if (req.user?.id) {
        await workspaceMemberService.ensureMember(workspace.id, req.user.id, "admin")

        // Assign "Workspace Admin" app role to the creator
        try {
          const appRoleService = req.scope.resolve("appRoleModuleService") as any
          const userService = req.scope.resolve("userModuleService") as any
          const [roles] = await appRoleService.listAndCountAppRoles({ name: "Workspace Admin", is_system: true }, { limit: 1 })
          if (roles.length > 0) {
            await userService.updateUser(req.user.id, { app_role_id: roles[0].id })
          }
        } catch {
          // Non-fatal — don't block workspace creation
        }
      }

      res.status(201).json({ workspace })
    } catch (err) {
      next(err)
    }
  })
}
