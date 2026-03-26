import type { Response, NextFunction } from "express"
import { resolveProjectAndAccess } from "../../../../../utils/project-access.js"

// Owner cancels their own pending request
export const DELETE = async (req: any, res: Response, next: NextFunction) => {
  try {
    const projectMemberService = req.scope.resolve("projectMemberModuleService") as any

    const request = await projectMemberService.getAccessRequest(req.params.requestId)
    if (!request || request.project_id !== req.params.id) {
      res.status(404).json({ error: { message: "Access request not found" } })
      return
    }
    if (request.user_id !== req.user?.id) {
      res.status(403).json({ error: { message: "Forbidden — can only cancel your own request" } })
      return
    }
    if (request.status !== "pending") {
      res.status(409).json({ error: { message: "Request is no longer pending" } })
      return
    }

    await projectMemberService.deleteAccessRequest(req.params.requestId)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}

export const PATCH = async (req: any, res: Response, next: NextFunction) => {
  try {
    const result = await resolveProjectAndAccess(req, res)
    if (!result) return
    if (!result.isAuthorized) {
      res.status(403).json({ error: { message: "Forbidden — project manager or admin role required" } })
      return
    }
    const { project } = result
    const projectMemberService = req.scope.resolve("projectMemberModuleService") as any

    const { action } = req.body
    if (action !== "approve" && action !== "deny") {
      res.status(400).json({ error: { message: "action must be 'approve' or 'deny'" } })
      return
    }

    const request = await projectMemberService.getAccessRequest(req.params.requestId)
    if (!request || request.project_id !== project.id) {
      res.status(404).json({ error: { message: "Access request not found" } })
      return
    }
    if (request.status !== "pending") {
      res.status(409).json({ error: { message: "Request is no longer pending" } })
      return
    }

    if (action === "approve") {
      await projectMemberService.ensureProjectMember(project.id, request.user_id, "member")
    }
    const updated = await projectMemberService.updateAccessRequestStatus(request.id, action === "approve" ? "approved" : "denied")

    // Activity log
    try {
      const activityService = req.scope.resolve("activityModuleService") as any
      await activityService.createActivity({
        entity_type: "project", entity_id: project.id,
        actor_id: req.user?.id ?? "system",
        action: action === "approve" ? "access_request_approved" : "access_request_denied",
        workspace_id: project.workspace_id,
        changes: { user_id: request.user_id },
      })
    } catch {}

    // Notify requesting user
    try {
      const notificationService = req.scope.resolve("notificationModuleService") as any
      await notificationService.createNotification({
        user_id: request.user_id,
        entity_type: "project_access_request",
        entity_id: request.id,
        action: action === "approve" ? "access_approved" : "access_denied",
        message: action === "approve"
          ? `Your request to join "${project.name}" was approved.`
          : `Your request to join "${project.name}" was denied.`,
        workspace_id: project.workspace_id,
        metadata: {
          project_id: project.id,
          project_name: project.name,
        },
      }).catch(() => {})
    } catch {
      // Non-fatal
    }

    const eventBus = req.scope.resolve("eventBus") as any
    eventBus.emit({
      name: "project.access_request_resolved",
      data: {
        project_id: project.id,
        project_name: project.name,
        workspace_id: project.workspace_id,
        user_id: request.user_id,
        action,
      },
    }).catch(() => {})

    res.json({ access_request: updated })
  } catch (err) {
    next(err)
  }
}
