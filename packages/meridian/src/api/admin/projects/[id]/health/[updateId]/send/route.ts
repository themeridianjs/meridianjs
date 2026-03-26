import type { Response } from "express"
import { hasProjectAccess } from "../../../../../../utils/project-access.js"

export const POST = async (req: any, res: Response) => {
  const svc = req.scope.resolve("projectModuleService") as any
  const userService = req.scope.resolve("userModuleService") as any
  const workspaceService = req.scope.resolve("workspaceModuleService") as any

  const project = await svc.retrieveProject(req.params.id).catch(() => null)
  if (!project) { res.status(404).json({ error: { message: "Project not found" } }); return }
  if (!await hasProjectAccess(req, project)) {
    res.status(403).json({ error: { message: "Forbidden" } })
    return
  }

  const raw = await svc.retrieveProjectHealthUpdate(req.params.updateId).catch(() => null)
  if (!raw) { res.status(404).json({ error: { message: "Health update not found" } }); return }

  const collaboratorIds: string[] = raw.collaborators ? JSON.parse(raw.collaborators) : []
  const senderId = req.user?.id ?? null

  // Filter out the sender
  const recipientIds = collaboratorIds.filter((id: string) => id !== senderId)
  if (recipientIds.length === 0) {
    res.json({ sent: 0 })
    return
  }

  // Check emailService is configured
  let emailService: any
  try {
    emailService = req.scope.resolve("emailService")
  } catch {
    res.status(501).json({ error: { message: "Email service is not configured" } })
    return
  }

  const workspace = await workspaceService.retrieveWorkspace(project.workspace_id).catch(() => null)
  if (!workspace) { res.status(404).json({ error: { message: "Workspace not found" } }); return }

  // Resolve sender name
  let senderName = "Someone"
  if (senderId) {
    const sender = await userService.retrieveUser(senderId).catch(() => null)
    if (sender) {
      senderName = `${sender.first_name ?? ""} ${sender.last_name ?? ""}`.trim() || sender.email
    }
  }

  // Resolve recipient user records
  const usersMap: Map<string, any> = await userService.listUsersByIds(recipientIds).catch(() => new Map())

  const config = req.scope.resolve("config") as any
  const appUrl: string = (config?.appUrl ?? process.env.APP_URL ?? "http://localhost:9001").replace(/\/$/, "")
  const reportUrl = `${appUrl}/${workspace.slug}/projects/${project.identifier}/health/${raw.id}`

  const emailPromises: Promise<void>[] = []
  for (const userId of recipientIds) {
    const user = usersMap.get(userId)
    if (!user?.email) continue
    emailPromises.push(
      emailService.send({
        to: user.email,
        subject: `Health Status Report — ${project.name}`,
        html: `<p>${senderName} has shared the health status report of <strong>${project.name}</strong> from <strong>${workspace.name}</strong>.</p><p><a href="${reportUrl}">View the report</a></p>`,
        text: `${senderName} has shared the health status report of ${project.name} from ${workspace.name}.\n\nView the report: ${reportUrl}`,
      }).catch(() => {})
    )
  }

  await Promise.all(emailPromises)

  res.json({ sent: emailPromises.length })
}
