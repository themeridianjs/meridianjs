import type { Response, NextFunction } from "express"
import { resolveProjectAndAccess } from "../../../../utils/project-access.js"

export const GET = async (req: any, res: Response, next: NextFunction) => {
  try {
    const result = await resolveProjectAndAccess(req, res)
    if (!result) return
    if (!result.isAuthorized) {
      res.status(403).json({ error: { message: "Forbidden — project manager or admin role required" } })
      return
    }

    const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
    const userService = req.scope.resolve("userModuleService") as any

    const requests = await projectMemberService.listPendingAccessRequests(req.params.id)
    const userMap = await userService.listUsersByIds(requests.map((r: any) => r.user_id))

    const enriched = requests.map((r: any) => ({
      id: r.id,
      project_id: r.project_id,
      user_id: r.user_id,
      message: r.message,
      status: r.status,
      created_at: r.created_at,
      user: userMap.get(r.user_id)
        ? (() => {
            const u = userMap.get(r.user_id)
            return { id: u.id, email: u.email, first_name: u.first_name, last_name: u.last_name }
          })()
        : null,
    }))

    res.json({ requests: enriched })
  } catch (err) {
    next(err)
  }
}

export const POST = async (req: any, res: Response, next: NextFunction) => {
  try {
    const projectService = req.scope.resolve("projectModuleService") as any
    const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
    const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any

    const project = await projectService.retrieveProject(req.params.id).catch(() => null)
    if (!project) {
      res.status(404).json({ error: { message: "Project not found" } })
      return
    }

    const userId: string = req.user?.id

    // Must be a workspace member to request project access
    const wsMembership = await workspaceMemberService.getMembership(project.workspace_id, userId)
    if (!wsMembership) {
      res.status(403).json({ error: { message: "Forbidden — must be a workspace member" } })
      return
    }

    // Must not already be a project member
    const members = await projectMemberService.listProjectMembers(project.id)
    if (members.some((m: any) => m.user_id === userId)) {
      res.status(409).json({ error: { message: "Already a member of this project" } })
      return
    }

    // Must not already have a pending request
    const existing = await projectMemberService.getPendingRequest(project.id, userId)
    if (existing) {
      res.status(409).json({ error: { message: "Access request already pending" } })
      return
    }

    const { message } = req.body
    const access_request = await projectMemberService.createAccessRequest({
      project_id: project.id,
      user_id: userId,
      message: message?.trim() || null,
    })

    // Notify project managers
    try {
      const notificationService = req.scope.resolve("notificationModuleService") as any
      const userService = req.scope.resolve("userModuleService") as any
      const requester = await userService.retrieveUser(userId).catch(() => null)
      const requesterName = requester
        ? `${requester.first_name ?? ""} ${requester.last_name ?? ""}`.trim() || requester.email
        : "Someone"

      const managers = members.filter((m: any) => m.role === "manager")
      for (const manager of managers) {
        await notificationService.createNotification({
          user_id: manager.user_id,
          entity_type: "project_access_request",
          entity_id: access_request.id,
          action: "access_requested",
          message: `${requesterName} requested access to "${project.name}"`,
          workspace_id: project.workspace_id,
          metadata: {
            requesting_user_id: userId,
            requesting_user_name: requesterName,
            project_id: project.id,
            project_name: project.name,
          },
        }).catch(() => {})
      }
    } catch {
      // Non-fatal
    }

    try {
      const activityService = req.scope.resolve("activityModuleService") as any
      await activityService.createActivity({
        entity_type: "project", entity_id: project.id,
        actor_id: userId,
        action: "access_requested",
        workspace_id: project.workspace_id,
        changes: { user_id: userId },
      })
    } catch {}

    const eventBus = req.scope.resolve("eventBus") as any
    eventBus.emit({
      name: "project.access_requested",
      data: { project_id: project.id, workspace_id: project.workspace_id, user_id: userId, request_id: access_request.id },
    }).catch(() => {})

    res.status(201).json({ access_request })
  } catch (err) {
    next(err)
  }
}

// User cancels their own pending request (no requestId needed)
export const DELETE = async (req: any, res: Response, next: NextFunction) => {
  try {
    const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
    const userId: string = req.user?.id

    const existing = await projectMemberService.getPendingRequest(req.params.id, userId)
    if (!existing) {
      res.status(404).json({ error: { message: "No pending access request found" } })
      return
    }

    await projectMemberService.deleteAccessRequest(existing.id)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}
