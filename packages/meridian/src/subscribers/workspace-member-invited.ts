import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { emailHtml, resolveTemplate } from "./_email-helper.js"

interface WorkspaceMemberInvitedData {
  invitation_id: string
  workspace_id: string
  email: string | null
  role: string
  created_by: string
}

export default async function handler({ event, container }: SubscriberArgs<WorkspaceMemberInvitedData>): Promise<void> {
  const data = event.data
  if (!data.email) return // link-only invite — no address to send to

  try {
    const emailService  = container.resolve("emailService") as any
    const invitationSvc = container.resolve("invitationModuleService") as any
    const workspaceSvc  = container.resolve("workspaceModuleService") as any
    const userSvc       = container.resolve("userModuleService") as any

    const [invitation, workspace, inviter] = await Promise.all([
      invitationSvc.retrieveInvitation(data.invitation_id),
      workspaceSvc.retrieveWorkspace(data.workspace_id),
      userSvc.retrieveUser(data.created_by),
    ])

    // Resolve the display role: prefer the custom app role name over the workspace role
    let roleDisplay = data.role
    if (invitation.app_role_id) {
      try {
        const appRoleSvc = container.resolve("appRoleModuleService") as any
        const appRole = await appRoleSvc.retrieveAppRole(invitation.app_role_id)
        roleDisplay = appRole.name
      } catch {
        // app role not found — fall back to workspace role
      }
    }

    const inviterName = [inviter.first_name, inviter.last_name].filter(Boolean).join(" ") || inviter.email

    const appUrl = process.env.APP_URL ?? "http://localhost:9000"
    const inviteLink = `${appUrl}/invite/${invitation.token}`

    const tpl = resolveTemplate(container, "workspace.member_invited", {
      workspace: { name: workspace.name },
      inviter: { name: inviterName },
      invitation: { token: invitation.token, role: roleDisplay },
      invitee: { email: data.email },
    })
    await emailService.send({
      to: data.email,
      subject: tpl?.subject ?? `${inviterName} invited you to join "${workspace.name}" on Meridian`,
      text: tpl?.text ?? `${inviterName} has invited you to join "${workspace.name}" as a ${roleDisplay}.\n\nAccept your invitation here: ${inviteLink}`,
      html: tpl?.html ?? emailHtml(
        `<strong>${inviterName}</strong> has invited you to join <strong>${workspace.name}</strong> as a <strong>${roleDisplay}</strong>.<br/><br/>` +
        `<a href="${inviteLink}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Accept Invitation</a><br/><br/>` +
        `Or copy this link: <a href="${inviteLink}">${inviteLink}</a>`
      ),
    })
  } catch (err) {
    const logger = container.resolve("logger") as any
    logger.error(`[email] workspace.member_invited: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const config: SubscriberConfig = { event: "workspace.member_invited" }
