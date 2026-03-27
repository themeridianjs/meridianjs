import type { Response, NextFunction } from "express"
import { assertWorkspaceAdmin } from "../../../../../utils/workspace-access.js"
import { assignDefaultUserRole } from "../../../../../utils/assign-default-role.js"

// Owner cancels their own pending request
export const DELETE = async (req: any, res: Response, next: NextFunction) => {
  try {
    const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any

    const accessRequest = await workspaceMemberService.getAccessRequest(req.params.requestId)
    if (!accessRequest || accessRequest.workspace_id !== req.params.id) {
      res.status(404).json({ error: { message: "Access request not found" } })
      return
    }
    if (accessRequest.user_id !== req.user?.id) {
      res.status(403).json({ error: { message: "Forbidden — can only cancel your own request" } })
      return
    }
    if (accessRequest.status !== "pending") {
      res.status(409).json({ error: { message: "Request is no longer pending" } })
      return
    }

    await workspaceMemberService.deleteAccessRequest(req.params.requestId)

    const eventBus = req.scope.resolve("eventBus") as any
    eventBus.emit({
      name: "workspace.access_request_cancelled",
      data: { workspace_id: req.params.id, user_id: accessRequest.user_id, request_id: req.params.requestId },
    }).catch(() => {})

    res.status(204).end()
  } catch (err) {
    next(err)
  }
}

export const PATCH = async (req: any, res: Response) => {
  if (!await assertWorkspaceAdmin(req, res)) return

  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
  const notificationService = req.scope.resolve("notificationModuleService") as any

  const workspace = await workspaceService.retrieveWorkspace(req.params.id)

  const accessRequest = await workspaceMemberService.getAccessRequest(req.params.requestId)
  if (!accessRequest || accessRequest.workspace_id !== req.params.id) {
    res.status(404).json({ error: { message: "Access request not found" } })
    return
  }

  if (accessRequest.status !== "pending") {
    res.status(409).json({ error: { message: "Access request has already been resolved" } })
    return
  }

  const { action } = req.body
  if (action !== "approve" && action !== "deny") {
    res.status(400).json({ error: { message: "action must be 'approve' or 'deny'" } })
    return
  }

  if (action === "approve") {
    await workspaceMemberService.ensureMember(req.params.id, accessRequest.user_id, "member")
    await assignDefaultUserRole(req, accessRequest.user_id)
  }

  const updated = await workspaceMemberService.updateAccessRequestStatus(
    req.params.requestId,
    action === "approve" ? "approved" : "denied"
  )

  // Notify the requesting user of the outcome
  const approvedMsg = `Your request to join ${workspace.name} has been approved`
  const deniedMsg = `Your request to join ${workspace.name} was not approved`

  notificationService.createNotification({
    user_id: accessRequest.user_id,
    entity_type: "workspace_access_request",
    entity_id: accessRequest.id,
    action: action === "approve" ? "access_approved" : "access_denied",
    message: action === "approve" ? approvedMsg : deniedMsg,
    workspace_id: req.params.id,
    metadata: { workspace_id: req.params.id, workspace_slug: workspace.slug },
  }).catch(() => {})

  const eventBus = req.scope.resolve("eventBus") as any
  eventBus.emit({
    name: "workspace.access_request_resolved",
    data: {
      workspace_id: workspace.id,
      workspace_name: workspace.name,
      workspace_slug: workspace.slug,
      user_id: accessRequest.user_id,
      action,
    },
  }).catch(() => {})

  res.json({ access_request: updated })
}
