import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { EVENTS } from "@meridianjs/types"
import { sseManager } from "@meridianjs/framework"
import { buildEmail, resolveTemplate } from "./_email-helper.js"

interface WorkspaceAccessRequestResolvedData {
  workspace_id: string
  workspace_name: string
  workspace_slug: string
  user_id: string
  action: "approve" | "deny"
}

export default async function handler({ event, container }: SubscriberArgs<WorkspaceAccessRequestResolvedData>): Promise<void> {
  const data = event.data

  // SSE: update the admin's access-requests badge and the requester's notification bell
  sseManager.broadcast(data.workspace_id, "workspace.access_request_resolved", {
    action: data.action,
  })
  sseManager.broadcast(data.workspace_id, "notification.created", {})

  // SSE: notify the requester directly (they may be on /awaiting-access with no workspace SSE)
  sseManager.broadcast(`user:${data.user_id}`, "workspace.access_request_resolved", {
    action: data.action,
    workspace_id: data.workspace_id,
    workspace_slug: data.workspace_slug,
  })

  try {
    const emailService = container.resolve("emailService") as any
    const userService  = container.resolve("userModuleService") as any
    const config       = container.resolve("config") as any
    const appUrl: string = config?.appUrl ?? process.env.APP_URL ?? "http://localhost:9001"

    const user = await userService.retrieveUser(data.user_id).catch(() => null)
    if (!user?.email) return

    const approved = data.action === "approve"
    const workspaceUrl = `${appUrl}/${data.workspace_slug}/projects`

    const tpl = resolveTemplate(container, "workspace.access_request_resolved", {
      workspace: { name: data.workspace_name },
      user,
      approved,
    })

    await emailService.send({
      to: user.email,
      subject: tpl?.subject ?? (approved
        ? `You've been granted access to "${data.workspace_name}"`
        : `Your request to join "${data.workspace_name}" was not approved`),
      text: tpl?.text ?? (approved
        ? `Your request to join "${data.workspace_name}" has been approved. You can now access the workspace here: ${workspaceUrl}`
        : `Your request to join "${data.workspace_name}" was reviewed and not approved at this time.`),
      html: tpl?.html ?? buildEmail(approved ? {
        preheader: `Your access to ${data.workspace_name} has been approved`,
        heading: `You're in — welcome to "${data.workspace_name}"`,
        body: `Your request to join <strong>${data.workspace_name}</strong> has been approved. You can now access the workspace and collaborate with your team.`,
        ctaText: "Open Workspace",
        ctaUrl: workspaceUrl,
      } : {
        preheader: `Your access request for ${data.workspace_name}`,
        heading: `Access request for "${data.workspace_name}"`,
        body: `Your request to join <strong>${data.workspace_name}</strong> was reviewed and not approved at this time. Please reach out to a workspace admin if you think this is a mistake.`,
        ctaText: "Open Meridian",
        ctaUrl: appUrl,
      }),
    })
  } catch (err) {
    const logger = container.resolve("logger") as any
    logger.error(`[email] workspace.access_request_resolved: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const config: SubscriberConfig = { event: EVENTS.WORKSPACE_ACCESS_REQUEST_RESOLVED }
