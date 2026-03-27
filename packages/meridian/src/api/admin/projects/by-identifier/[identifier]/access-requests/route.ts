import type { Response, NextFunction } from "express"

// Workspace member submits or cancels a project access request using the project identifier.
// This lets the client avoid needing the project ID from a prior (forbidden) fetch.

export const POST = async (req: any, res: Response, next: NextFunction) => {
  try {
    const projectService = req.scope.resolve("projectModuleService") as any
    const projectMemberService = req.scope.resolve("projectMemberModuleService") as any
    const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any

    const identifier = req.params.identifier
    const project = await projectService.retrieveProjectByIdentifier(identifier).catch(() => null)
    if (!project) {
      res.status(404).json({ error: { message: `Project "${identifier}" not found` } })
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

export const DELETE = async (req: any, res: Response, next: NextFunction) => {
  try {
    const projectService = req.scope.resolve("projectModuleService") as any
    const projectMemberService = req.scope.resolve("projectMemberModuleService") as any

    const identifier = req.params.identifier
    const project = await projectService.retrieveProjectByIdentifier(identifier).catch(() => null)
    if (!project) {
      res.status(404).json({ error: { message: `Project "${identifier}" not found` } })
      return
    }

    const userId: string = req.user?.id
    const existing = await projectMemberService.getPendingRequest(project.id, userId)
    if (!existing) {
      res.status(404).json({ error: { message: "No pending access request found" } })
      return
    }

    await projectMemberService.deleteAccessRequest(existing.id)

    const eventBus = req.scope.resolve("eventBus") as any
    eventBus.emit({
      name: "project.access_request_cancelled",
      data: { project_id: project.id, workspace_id: project.workspace_id, user_id: userId, request_id: existing.id },
    }).catch(() => {})

    res.status(204).end()
  } catch (err) {
    next(err)
  }
}
