import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { sseManager } from "@meridianjs/framework"
import { emailHtml, resolveTemplate } from "./_email-helper.js"

interface WorkspaceAccessRequestedData {
  access_request_id: string
  workspace_id: string
  user_id: string
  requester_name: string
  requester_email: string | null
  admin_user_ids: string[]
}

export default async function handler({ event, container }: SubscriberArgs<WorkspaceAccessRequestedData>): Promise<void> {
  const data = event.data

  // SSE broadcast so admins get real-time badge update
  sseManager.broadcast(data.workspace_id, "workspace.access_requested", {
    access_request_id: data.access_request_id,
  })
  sseManager.broadcast(data.workspace_id, "notification.created", {})

  // Email all workspace admins
  if (data.admin_user_ids.length === 0) return

  try {
    const emailService   = container.resolve("emailService") as any
    const workspaceSvc   = container.resolve("workspaceModuleService") as any
    const userSvc        = container.resolve("userModuleService") as any

    const workspace = await workspaceSvc.retrieveWorkspace(data.workspace_id)
    if (!workspace) return

    const appUrl = process.env.APP_URL ?? "http://localhost:9000"
    const settingsUrl = `${appUrl}/${workspace.slug}/settings?tab=access-requests`

    const adminUsers = await userSvc.listUsersByIds(data.admin_user_ids)

    const tpl = resolveTemplate(container, "workspace.access_requested", {
      workspace: { name: workspace.name },
      requester: { name: data.requester_name, email: data.requester_email },
    })

    await Promise.all(
      [...adminUsers.values()].map(async (admin: any) => {
        if (!admin.email) return
        const subject = tpl?.subject ?? `${data.requester_name} requested access to "${workspace.name}"`
        const text = tpl?.text ?? `${data.requester_name} has requested access to "${workspace.name}".\n\nReview their request here: ${settingsUrl}`
        const html = tpl?.html ?? emailHtml(
          `<strong>${data.requester_name}</strong> has requested access to join <strong>${workspace.name}</strong>.<br/><br/>` +
          `<a href="${settingsUrl}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Review Request</a><br/><br/>` +
          `Or visit: <a href="${settingsUrl}">${settingsUrl}</a>`
        )
        await emailService.send({ to: admin.email, subject, text, html })
      })
    )
  } catch (err) {
    const logger = container.resolve("logger") as any
    logger.error(`[email] workspace.access_requested: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const config: SubscriberConfig = { event: "workspace.access_requested" }
