import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { sseManager } from "@meridianjs/framework"
import { buildEmail, buildProjectUrl, userDisplayName, resolveTemplate } from "./_email-helper.js"

interface ProjectMemberAddedData {
  project_id: string
  project_name: string
  workspace_id: string
  user_id: string
  actor_id: string
}

export default async function handler({ event, container }: SubscriberArgs<ProjectMemberAddedData>): Promise<void> {
  const data = event.data
  if (!data.user_id || data.user_id === data.actor_id) return

  const notifService = container.resolve("notificationModuleService") as any
  const userService = container.resolve("userModuleService") as any

  // Skip notification if user is deactivated
  const activeUserMap = await userService.listUsersByIds([data.user_id])
  if (!activeUserMap.has(data.user_id)) return

  try {
    await notifService.createNotification({
      user_id: data.user_id,
      entity_type: "project",
      entity_id: data.project_id,
      action: "member_added",
      message: `You were added to the project "${data.project_name}"`,
      workspace_id: data.workspace_id,
      metadata: { project_id: data.project_id },
    })
  } catch (err) {
    const logger = container.resolve("logger") as any
    logger.error(`[notification] project.member_added: ${err instanceof Error ? err.message : String(err)}`)
  }

  sseManager.broadcast(data.workspace_id, "project.member_added", {
    project_id: data.project_id,
    user_id: data.user_id,
  })
  sseManager.broadcast(data.workspace_id, "notification.created", {})

  // ── Email ──────────────────────────────────────────────────────────────────
  try {
    const emailService = container.resolve("emailService") as any
    const userService  = container.resolve("userModuleService") as any
    const config       = container.resolve("config") as any
    const appUrl: string = config?.appUrl ?? process.env.APP_URL ?? "http://localhost:9001"

    const projectUrl = await buildProjectUrl(container, appUrl, data.project_id, data.workspace_id)

    // Fetch actor name (who added the member)
    let actorName = "A team member"
    try {
      const actor = await userService.retrieveUser(data.actor_id)
      actorName = userDisplayName(actor)
    } catch { /* fallback */ }

    const user = await userService.retrieveUser(data.user_id)
    if (user?.email) {
      const tpl = resolveTemplate(container, "project.member_added", { project: { name: data.project_name }, user })
      await emailService.send({
        to: user.email,
        subject: tpl?.subject ?? `You've been added to project "${data.project_name}"`,
        text: tpl?.text ?? `${actorName} added you to the project "${data.project_name}".\n\nView it here: ${projectUrl}`,
        html: tpl?.html ?? buildEmail({
          preheader: `${actorName} added you to ${data.project_name}`,
          heading: `You've been added to "${data.project_name}"`,
          body: `<strong>${actorName}</strong> added you as a member of the project: <em>${data.project_name}</em>`,
          ctaText: "View Project",
          ctaUrl: projectUrl,
        }),
      })
    }
  } catch (err) {
    const logger = container.resolve("logger") as any
    logger.error(`[email] project.member_added: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const config: SubscriberConfig = { event: "project.member_added" }
