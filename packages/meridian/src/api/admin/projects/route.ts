import type { Response, NextFunction } from "express"
import { requirePermission } from "@meridianjs/auth"
import { createProjectWorkflow } from "../../../workflows/create-project.js"
import { getAccessibleWorkspaceIds } from "../../utils/workspace-access.js"
import { isGlobalAdmin } from "../../utils/project-access.js"
import { ROLES, PROJECT_ROLES } from "@meridianjs/types"

export const GET = async (req: any, res: Response) => {
  const projectService = req.scope.resolve("projectModuleService") as any
  const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
  const limit = Math.min(Number(req.query.limit) || 20, 500)
  const offset = Number(req.query.offset) || 0
  const filters: Record<string, unknown> = {}
  if (req.query.workspace_id) {
    filters.workspace_id = req.query.workspace_id
  } else if (req.query.workspace_ids) {
    const ids = (req.query.workspace_ids as string).split(",").filter(Boolean)
    if (ids.length === 1) filters.workspace_id = ids[0]
    else if (ids.length > 1) filters.workspace_id = ids
  }
  if (req.query.status) filters.status = req.query.status

  const roles: string[] = req.user?.roles ?? []
  const isPrivileged = isGlobalAdmin(req)

  if (isPrivileged) {
    // Super-admin org-scope bypass: return all projects unfiltered
    if (roles.includes(ROLES.SUPER_ADMIN) && req.query.org_scope === "true") {
      const [projects, count] = await projectService.listAndCountProjects(filters, { limit, offset })
      res.json({ projects, count, limit, offset })
      return
    }

    // Determine which workspace IDs are being queried
    let queriedWsIds: string[] | undefined
    if (Array.isArray(filters.workspace_id)) {
      queriedWsIds = filters.workspace_id as string[]
    } else if (filters.workspace_id) {
      queriedWsIds = [filters.workspace_id as string]
    }

    const allowedIds = await getAccessibleWorkspaceIds(req, queriedWsIds)

    if (allowedIds.length === 0) {
      res.json({ projects: [], count: 0, limit, offset })
      return
    }

    const privilegedFilters: Record<string, unknown> = { ...filters }
    privilegedFilters.workspace_id = allowedIds.length === 1 ? allowedIds[0] : allowedIds
    const [projects, count] = await projectService.listAndCountProjects(privilegedFilters, { limit, offset })
    const projectIds = projects.map((p: any) => p.id)
    const pendingCounts = await projectMemberService.getPendingCountsForProjects(projectIds)
    const enriched = projects.map((p: any) => ({
      ...p,
      is_member: true,
      pending_request_count: pendingCounts.get(p.id) ?? 0,
      has_pending_request: false,
    }))
    res.json({ projects: enriched, count, limit, offset })
    return
  }

  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
  const teamMemberService = req.scope.resolve("teamMemberModuleService") as any
  const userId = req.user?.id

  if (!filters.workspace_id) {
    res.status(400).json({ error: { message: "workspace_id is required" } })
    return
  }

  const membership = await workspaceMemberService.getMembership(filters.workspace_id as string, userId)
  if (!membership) {
    res.status(403).json({ error: { message: "Forbidden — not a member of this workspace" } })
    return
  }

  // All workspace members see ALL projects in the workspace
  const [projects, count] = await projectService.listAndCountProjects(filters, { limit, offset })
  const projectIds = projects.map((p: any) => p.id)

  // Workspace admins have access to all projects
  if (membership.role === ROLES.ADMIN) {
    const pendingCounts = await projectMemberService.getPendingCountsForProjects(projectIds)
    const enriched = projects.map((p: any) => ({
      ...p,
      is_member: true,
      pending_request_count: pendingCounts.get(p.id) ?? 0,
      has_pending_request: false,
    }))
    res.json({ projects: enriched, count, limit, offset })
    return
  }

  // Regular members: determine per-project access and pending counts for managed projects
  const userTeamIds = await teamMemberService.getUserTeamIds(userId)
  const memberRecords = await projectMemberService.listProjectMembersForProjects(projectIds)
  const teamRecords = await projectMemberService.listProjectTeamIdsForProjects(projectIds)

  const memberProjectIds = new Set(memberRecords.filter((m: any) => m.user_id === userId).map((m: any) => m.project_id))
  const teamProjectIds = new Set(
    userTeamIds.length > 0
      ? teamRecords.filter((t: any) => userTeamIds.includes(t.team_id)).map((t: any) => t.project_id)
      : []
  )
  const accessibleIds = new Set([...memberProjectIds, ...teamProjectIds])

  // Only fetch pending counts for projects where user is a manager
  const managedProjectIds = memberRecords
    .filter((m: any) => m.user_id === userId && m.role === PROJECT_ROLES.MANAGER)
    .map((m: any) => m.project_id)
  const pendingCounts = await projectMemberService.getPendingCountsForProjects(managedProjectIds)

  // Check which non-member projects the user has a pending access request for
  const nonMemberIds = projects.filter((p: any) => !accessibleIds.has(p.id)).map((p: any) => p.id)
  const pendingProjectIds = await projectMemberService.getUserPendingProjectIds(userId, nonMemberIds)

  const enriched = projects.map((p: any) => ({
    ...p,
    is_member: accessibleIds.has(p.id),
    pending_request_count: pendingCounts.get(p.id) ?? 0,
    has_pending_request: !accessibleIds.has(p.id) && pendingProjectIds.has(p.id),
  }))
  res.json({ projects: enriched, count, limit, offset })
}

export const POST = async (req: any, res: Response, next: NextFunction) => {
  requirePermission("project:create")(req, res, async () => {
    try {
      const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
      const { name, description, workspace_id, visibility, icon, color, identifier, initial_statuses, metadata } = req.body
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
          metadata: metadata ?? null,
        },
      })
      if (transaction_status === "reverted") {
        const err = errors[0]
        res.status((err as any).status ?? 500).json({ error: { message: err.message } })
        return
      }
      // Auto-create project membership for the creator (manager role)
      if (req.user?.id && project) {
        await projectMemberService.ensureProjectMember(project.id, req.user.id, PROJECT_ROLES.MANAGER)
      }
      res.status(201).json({ project })
    } catch (err) {
      next(err)
    }
  })
}
