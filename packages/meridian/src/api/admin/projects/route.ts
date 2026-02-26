import type { Response } from "express"
import { requirePermission } from "@meridianjs/auth"
import { createProjectWorkflow } from "../../../workflows/create-project.js"

export const GET = async (req: any, res: Response) => {
  const projectService = req.scope.resolve("projectModuleService") as any
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const offset = Number(req.query.offset) || 0
  const filters: Record<string, unknown> = {}
  if (req.query.workspace_id) filters.workspace_id = req.query.workspace_id
  if (req.query.status) filters.status = req.query.status

  const roles: string[] = req.user?.roles ?? []
  const isPrivileged = roles.includes("super-admin") || roles.includes("admin")

  if (isPrivileged) {
    const [projects, count] = await projectService.listAndCountProjects(filters, { limit, offset })
    res.json({ projects, count, limit, offset })
    return
  }

  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
  const teamMemberService = req.scope.resolve("teamMemberModuleService") as any
  const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
  const userId = req.user?.id

  // Workspace admins see all projects in their workspace
  if (filters.workspace_id) {
    const membership = await workspaceMemberService.getMembership(filters.workspace_id as string, userId)
    if (!membership) {
      res.status(403).json({ error: { message: "Forbidden — not a member of this workspace" } })
      return
    }
    if (membership.role === "admin") {
      const [projects, count] = await projectService.listAndCountProjects(filters, { limit, offset })
      res.json({ projects, count, limit, offset })
      return
    }
  }

  // Members: filter by explicit project access
  const userTeamIds = await teamMemberService.getUserTeamIds(userId)
  const accessibleProjectIds = await projectMemberService.getAccessibleProjectIds(userId, userTeamIds)

  if (accessibleProjectIds.length === 0) {
    res.json({ projects: [], count: 0, limit, offset })
    return
  }

  const memberFilters: Record<string, unknown> = { ...filters, id: accessibleProjectIds }
  const [projects, count] = await projectService.listAndCountProjects(memberFilters, { limit, offset })
  res.json({ projects, count, limit, offset })
}

export const POST = async (req: any, res: Response) => {
  requirePermission("project:create")(req, res, async () => {
    const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
    const { name, description, workspace_id, visibility, icon, color, identifier, initial_statuses } = req.body
    if (!name || !workspace_id) {
      res.status(400).json({ error: { message: "name and workspace_id are required" } })
      return
    }
    const { result: project, errors, transaction_status } = await createProjectWorkflow(req.scope).run({
      input: {
        name, identifier, description: description ?? null, workspace_id,
        visibility: visibility ?? "private", icon: icon ?? null, color: color ?? null,
        owner_id: req.user?.id ?? null, actor_id: req.user?.id ?? null,
        initial_statuses: initial_statuses ?? undefined,
      },
    })
    if (transaction_status === "reverted") {
      const err = errors[0]
      res.status((err as any).status ?? 500).json({ error: { message: err.message } })
      return
    }
    // Auto-create project membership for the creator (manager role)
    if (req.user?.id && project) {
      await projectMemberService.ensureProjectMember(project.id, req.user.id, "manager")
    }
    res.status(201).json({ project })
  })
}
