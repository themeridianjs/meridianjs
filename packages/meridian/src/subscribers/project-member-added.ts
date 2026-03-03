import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { sseManager } from "@meridianjs/framework"
import { emailHtml } from "./_email-helper.js"

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
      await emailService.send({
        to: user.email,
        subject: `You've been added to project "${data.project_name}"`,
        text: `You've been added to the project "${data.project_name}".`,
        html: emailHtml(`You've been added to the project <strong>"${data.project_name}"</strong>.`),
      })
    }
  } catch (err) {
    console.error("[email] project.member_added:", err)
  }
}

export const config: SubscriberConfig = { event: "project.member_added" }
