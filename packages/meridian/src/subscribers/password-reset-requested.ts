import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { emailHtml, resolveTemplate } from "./_email-helper.js"

interface PasswordResetRequestedData {
  user_id: string
  email: string
  token: string
}

export default async function handler({ event, container }: SubscriberArgs<PasswordResetRequestedData>): Promise<void> {
  const data = event.data

  try {
    const emailService = container.resolve("emailService") as any

    const appUrl = process.env.APP_URL ?? "http://localhost:9000"
    const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(data.token)}`

    const tpl = resolveTemplate(container, "password.reset_requested", {
      user: { email: data.email },
      reset: { link: resetLink, token: data.token },
    })

    await emailService.send({
      to: data.email,
      subject: tpl?.subject ?? "Reset your Meridian password",
      text: tpl?.text ?? `You requested a password reset. Use this link to set a new password (valid for 30 minutes):\n\n${resetLink}\n\nIf you didn't request this, you can safely ignore this email.`,
      html: tpl?.html ?? emailHtml(
        `You requested a password reset.<br/><br/>` +
        `<a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Reset Password</a><br/><br/>` +
        `This link is valid for 30 minutes. If you didn't request this, you can safely ignore this email.`
      ),
    })
  } catch (err) {
    const logger = container.resolve("logger") as any
    logger.error(`[email] password.reset_requested: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const config: SubscriberConfig = { event: "password.reset_requested" }
