import type { Response } from "express"

export const GET = async (req: any, res: Response) => {
  const notifService = req.scope.resolve("notificationModuleService") as any
  const projectService = req.scope.resolve("projectModuleService") as any
  const workspaceService = req.scope.resolve("workspaceModuleService") as any
  const userId = req.user?.id
  if (!userId) { res.status(401).json({ error: { message: "Unauthorized" } }); return }
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const offset = Number(req.query.offset) || 0
  const unreadOnly = req.query.unread === "true"
  const [notifications, count] = await notifService.listNotificationsForUser(userId, { limit, offset, unreadOnly })

  const projectIds = [...new Set(
    notifications.flatMap((notification: any) => {
      if (notification.entity_type === "project") return [notification.entity_id]

      const projectId = notification.metadata?.project_id
      if (
        (notification.entity_type === "issue" ||
          notification.entity_type === "project_access_request" ||
          notification.entity_type === "project_access_resolved") &&
        typeof projectId === "string"
      ) {
        return [projectId]
      }

      return []
    })
  )]

  const workspaceIds = [...new Set(
    notifications.flatMap((notification: any) => {
      const ids: string[] = []
      if (typeof notification.workspace_id === "string") ids.push(notification.workspace_id)
      if (typeof notification.metadata?.workspace_id === "string") ids.push(notification.metadata.workspace_id)
      return ids
    })
  )]

  const [projectEntries, workspaceEntries] = await Promise.all([
    Promise.all(projectIds.map(async (id) => [id, await projectService.retrieveProject(id).catch(() => null)] as const)),
    Promise.all(workspaceIds.map(async (id) => [id, await workspaceService.retrieveWorkspace(id).catch(() => null)] as const)),
  ])

  const projectMap = new Map(projectEntries)
  const workspaceMap = new Map(workspaceEntries)

  const enrichedNotifications = notifications.map((notification: any) => {
    const metadata: Record<string, unknown> = { ...(notification.metadata ?? {}) }
    const projectId = notification.entity_type === "project"
      ? notification.entity_id
      : typeof metadata.project_id === "string"
        ? metadata.project_id
        : null
    const project = projectId ? projectMap.get(projectId) : null
    const workspaceId = typeof metadata.workspace_id === "string"
      ? metadata.workspace_id
      : project?.workspace_id ?? notification.workspace_id
    const workspace = workspaceId ? workspaceMap.get(workspaceId) : null

    if (project) {
      metadata.project_id ??= project.id
      metadata.project_identifier ??= project.identifier
      metadata.project_name ??= project.name
      metadata.workspace_id ??= project.workspace_id
    }

    if (workspace) {
      metadata.workspace_id ??= workspace.id
      metadata.workspace_slug ??= workspace.slug
    }

    return { ...notification, metadata }
  })

  res.json({ notifications: enrichedNotifications, count, limit, offset })
}
