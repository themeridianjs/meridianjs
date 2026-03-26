import type { Response } from "express"

// Owner cancels their own pending request
export const DELETE = async (req: any, res: Response) => {
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
  res.status(204).end()
}

export const PATCH = async (req: any, res: Response) => {
  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
  const notificationService = req.scope.resolve("notificationModuleService") as any
  const userService = req.scope.resolve("userModuleService") as any

  const workspace = await workspaceService.retrieveWorkspace(req.params.id)
  if (!workspace) {
    res.status(404).json({ error: { message: "Workspace not found" } })
    return
  }

  // Only workspace admins or global admins can approve/deny
  const roles: string[] = req.user?.roles ?? []
  const isGlobalAdmin = roles.includes("super-admin") || roles.includes("admin")
  if (!isGlobalAdmin) {
    const membership = await workspaceMemberService.getMembership(req.params.id, req.user?.id)
    if (!membership || membership.role !== "admin") {
      res.status(403).json({ error: { message: "Workspace admin access required" } })
      return
    }
  }

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
    // Assign "User" system role by default
    try {
      const appRoleService = req.scope.resolve("appRoleModuleService") as any
      const [userRoles] = await appRoleService.listAndCountAppRoles({ name: "User", is_system: true }, { limit: 1 })
      if (userRoles.length > 0) {
        await userService.updateUser(accessRequest.user_id, { app_role_id: userRoles[0].id })
      }
    } catch {
      // Non-fatal
    }
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
