import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { sseManager } from "@meridianjs/framework"
import { emailHtml, resolveTemplate } from "./_email-helper.js"

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

  await notifService.createNotification({
    user_id: data.user_id,
    entity_type: "project",
    entity_id: data.project_id,
    action: "member_added",
    message: `You were added to the project "${data.project_name}"`,
    workspace_id: data.workspace_id,
    metadata: { project_id: data.project_id },
  })

  sseManager.broadcast(data.workspace_id, "project.member_added", {
    project_id: data.project_id,
    user_id: data.user_id,
  })

  // ── Email ──────────────────────────────────────────────────────────────────
  try {
    const emailService = container.resolve("emailService") as any
    const userService  = container.resolve("userModuleService") as any
    const user = await userService.retrieveUser(data.user_id)
    if (user?.email) {
      const tpl = resolveTemplate(container, "project.member_added", { project: { name: data.project_name }, user })
      await emailService.send({
        to: user.email,
        subject: tpl?.subject ?? `You've been added to project "${data.project_name}"`,
        text: tpl?.text ?? `You've been added to the project "${data.project_name}".`,
        html: tpl?.html ?? emailHtml(`You've been added to the project <strong>"${data.project_name}"</strong>.`),
      })
    }
  } catch (err) {
    const logger = container.resolve("logger") as any
    logger.error(`[email] project.member_added: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const config: SubscriberConfig = { event: "project.member_added" }
