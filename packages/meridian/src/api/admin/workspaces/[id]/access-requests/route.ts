import type { Response } from "express"

async function assertWorkspaceAdmin(req: any, res: Response): Promise<boolean> {
  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any

  const workspace = await workspaceService.retrieveWorkspace(req.params.id)
  if (!workspace) {
    res.status(404).json({ error: { message: "Workspace not found" } })
    return false
  }

  const roles: string[] = req.user?.roles ?? []
  const isGlobalAdmin = roles.includes("super-admin") || roles.includes("admin")
  if (isGlobalAdmin) return true

  const membership = await workspaceMemberService.getMembership(req.params.id, req.user?.id)
  if (!membership || membership.role !== "admin") {
    res.status(403).json({ error: { message: "Workspace admin access required" } })
    return false
  }
  return true
}

export const GET = async (req: any, res: Response) => {
  if (!await assertWorkspaceAdmin(req, res)) return

  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
  const userService = req.scope.resolve("userModuleService") as any

  const requests = await workspaceMemberService.listPendingAccessRequests(req.params.id)

  const userIds = [...new Set(requests.map((r: any) => r.user_id))]
  const userMap = userIds.length > 0 ? await userService.listUsersByIds(userIds) : new Map()

  const enriched = requests.map((r: any) => {
    const user = userMap.get(r.user_id) ?? null
    return {
      id: r.id,
      workspace_id: r.workspace_id,
      user_id: r.user_id,
      message: r.message,
      status: r.status,
      created_at: r.created_at,
      user: user ? { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name } : null,
    }
  })

  res.json({ access_requests: enriched, count: enriched.length })
}

export const POST = async (req: any, res: Response) => {
  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const workspaceMemberService = req.scope.resolve("workspaceMemberModuleService") as any
  const notificationService = req.scope.resolve("notificationModuleService") as any
  const userService = req.scope.resolve("userModuleService") as any

  const workspace = await workspaceService.retrieveWorkspace(req.params.id)
  if (!workspace) {
    res.status(404).json({ error: { message: "Workspace not found" } })
    return
  }

  const userId = req.user?.id
  if (!userId) {
    res.status(401).json({ error: { message: "Unauthorized" } })
    return
  }

  // Cannot request if already a member
  const alreadyMember = await workspaceMemberService.isMember(req.params.id, userId)
  if (alreadyMember) {
    res.status(409).json({ error: { message: "You are already a member of this workspace" } })
    return
  }

  // Cannot request if already has a pending request
  const existingRequest = await workspaceMemberService.getPendingRequest(req.params.id, userId)
  if (existingRequest) {
    res.status(409).json({ error: { message: "You already have a pending access request for this workspace" } })
    return
  }

  const { message } = req.body
  const accessRequest = await workspaceMemberService.createAccessRequest({
    workspace_id: req.params.id,
    user_id: userId,
    message: message ?? null,
  })

  // Notify workspace admins
  const [wsMembers] = await workspaceMemberService.listAndCountWorkspaceMembers(
    { workspace_id: req.params.id, role: "admin" },
    { limit: 100 }
  )

  const requestingUser = await userService.retrieveUser(userId).catch(() => null)
  const requesterName = requestingUser
    ? `${requestingUser.first_name ?? ""} ${requestingUser.last_name ?? ""}`.trim() || requestingUser.email
    : "A user"

  const notifyUserIds: string[] = [...new Set<string>(wsMembers.map((m: any) => m.user_id as string))]

  await Promise.all(
    notifyUserIds.map((adminId: string) =>
      notificationService.createNotification({
        user_id: adminId,
        entity_type: "workspace_access_request",
        entity_id: accessRequest.id,
        action: "access_requested",
        message: `${requesterName} requested access to ${workspace.name}`,
        workspace_id: req.params.id,
        metadata: {
          requesting_user_id: userId,
          requesting_user_name: requesterName,
          workspace_id: req.params.id,
          workspace_slug: workspace.slug,
        },
      }).catch(() => {})
    )
  )

  // Emit event for subscriber (email + SSE broadcast)
  const eventBus = req.scope.resolve("eventBus") as any
  eventBus.emit({
    name: "workspace.access_requested",
    data: {
      access_request_id: accessRequest.id,
      workspace_id: req.params.id,
      user_id: userId,
      requester_name: requesterName,
      requester_email: requestingUser?.email ?? null,
      admin_user_ids: notifyUserIds,
    },
  }).catch(() => {})

  res.status(201).json({ access_request: accessRequest })
}
