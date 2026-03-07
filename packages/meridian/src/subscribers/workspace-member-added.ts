import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { emailHtml, resolveTemplate } from "./_email-helper.js"

interface WorkspaceMemberAddedData {
  workspace_id: string
  user_id: string
  role: string
  actor_id: string
}

export default async function handler({ event, container }: SubscriberArgs<WorkspaceMemberAddedData>): Promise<void> {
  const data = event.data
  // Skip self-additions (e.g. workspace creator auto-added on creation)
  if (!data.user_id || data.user_id === data.actor_id) return

  try {
    const emailService    = container.resolve("emailService") as any
    const userService     = container.resolve("userModuleService") as any
    const workspaceService = container.resolve("workspaceModuleService") as any

    const [user, workspace] = await Promise.all([
      userService.retrieveUser(data.user_id),
      workspaceService.retrieveWorkspace(data.workspace_id),
    ])

    if (!user?.email) return

    const tpl = resolveTemplate(container, "workspace.member_added", {
      workspace: { name: workspace.name },
      user,
    })

    await emailService.send({
      to: user.email,
      subject: tpl?.subject ?? `You've been added to "${workspace.name}" on Meridian`,
      text: tpl?.text ?? `You've been added to the workspace "${workspace.name}" as a ${data.role}. Sign in to get started.`,
      html: tpl?.html ?? emailHtml(
        `You've been added to the workspace <strong>${workspace.name}</strong> as a <strong>${data.role}</strong>.<br/><br/>` +
        `Sign in to Meridian to get started.`
      ),
    })
  } catch (err) {
    const logger = container.resolve("logger") as any
    logger.error(`[email] workspace.member_added: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const config: SubscriberConfig = { event: "workspace.member_added" }
