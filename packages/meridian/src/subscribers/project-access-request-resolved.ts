import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { sseManager } from "@meridianjs/framework"
import { buildEmail, buildProjectUrl, resolveTemplate } from "./_email-helper.js"

interface ProjectAccessRequestResolvedData {
  project_id: string
  project_name: string
  workspace_id: string
  user_id: string
  action: "approve" | "deny"
}

export default async function handler({ event, container }: SubscriberArgs<ProjectAccessRequestResolvedData>): Promise<void> {
  const data = event.data

  // SSE: update the admin's access-requests badge and the requester's notification bell
  sseManager.broadcast(data.workspace_id, "project.access_request_resolved", {
    project_id: data.project_id,
    action: data.action,
  })
  sseManager.broadcast(data.workspace_id, "notification.created", {})

  try {
    const emailService = container.resolve("emailService") as any
    const userService  = container.resolve("userModuleService") as any
    const config       = container.resolve("config") as any
    const appUrl: string = config?.appUrl ?? process.env.APP_URL ?? "http://localhost:9001"

    const user = await userService.retrieveUser(data.user_id).catch(() => null)
    if (!user?.email) return

    const approved = data.action === "approve"
    const projectUrl = await buildProjectUrl(container, appUrl, data.project_id, data.workspace_id)

    const tpl = resolveTemplate(container, "project.access_request_resolved", {
      project: { name: data.project_name },
      user,
      approved,
    })

    await emailService.send({
      to: user.email,
      subject: tpl?.subject ?? (approved
        ? `You've been granted access to "${data.project_name}"`
        : `Your request to join "${data.project_name}" was not approved`),
      text: tpl?.text ?? (approved
        ? `Your request to join the project "${data.project_name}" has been approved. View it here: ${projectUrl}`
        : `Your request to join the project "${data.project_name}" was reviewed and not approved at this time.`),
      html: tpl?.html ?? buildEmail(approved ? {
        preheader: `Your access to ${data.project_name} has been approved`,
        heading: `Access granted to "${data.project_name}"`,
        body: `Your request to join the project <strong>${data.project_name}</strong> has been approved. You can now view and collaborate on the project.`,
        ctaText: "View Project",
        ctaUrl: projectUrl,
      } : {
        preheader: `Your access request for ${data.project_name}`,
        heading: `Access request for "${data.project_name}"`,
        body: `Your request to join the project <strong>${data.project_name}</strong> was reviewed and not approved at this time. Please reach out to a project manager if you think this is a mistake.`,
        ctaText: "Open Meridian",
        ctaUrl: appUrl,
      }),
    })
  } catch (err) {
    const logger = container.resolve("logger") as any
    logger.error(`[email] project.access_request_resolved: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const config: SubscriberConfig = { event: "project.access_request_resolved" }
