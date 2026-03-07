import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
import { emailHtml, resolveTemplate } from "./_email-helper.js"

interface PasswordOtpRequestedData {
  user_id: string
  email: string
  otp: string
}

export default async function handler({ event, container }: SubscriberArgs<PasswordOtpRequestedData>): Promise<void> {
  const data = event.data

  try {
    const emailService = container.resolve("emailService") as any

    const tpl = resolveTemplate(container, "password.otp_requested", {
      user: { email: data.email },
      otp: data.otp,
    })

    await emailService.send({
      to: data.email,
      subject: tpl?.subject ?? "Your Meridian verification code",
      text: tpl?.text ?? `Your verification code is: ${data.otp}\n\nThis code expires in 10 minutes. If you didn't request this, you can safely ignore this email.`,
      html: tpl?.html ?? emailHtml(
        `Your verification code is:<br/><br/>` +
        `<div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:16px 0;font-family:monospace;color:#4f46e5">${data.otp}</div><br/>` +
        `This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.`
      ),
    })
  } catch (err) {
    const logger = container.resolve("logger") as any
    logger.error(`[email] password.otp_requested: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export const config: SubscriberConfig = { event: "password.otp_requested" }
