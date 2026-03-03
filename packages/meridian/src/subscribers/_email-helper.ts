import type { IEmailTemplateService, EmailTemplateOverride } from "@meridianjs/types"

export function emailHtml(message: string): string {
  return `<div style="font-family:sans-serif;color:#1a1a1a;max-width:560px;padding:24px">
    <p>${message}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
    <p style="font-size:12px;color:#6b7280">Sent by Meridian</p>
  </div>`
}

export function resolveTemplate(
  container: any,
  event: string,
  data: unknown
): EmailTemplateOverride | null {
  try {
    const svc = container.resolve("emailTemplateService") as IEmailTemplateService
    return svc.render(event, data) ?? null
  } catch {
    return null // no emailTemplateService registered → use defaults
  }
}
