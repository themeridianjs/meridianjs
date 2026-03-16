import type { IEmailTemplateService, EmailTemplateOverride } from "@meridianjs/types"

// ── Template builder ──────────────────────────────────────────────────────────

export interface EmailOptions {
  /** Short preview text shown in inbox lists */
  preheader?: string
  heading: string
  /** Main body — may contain <strong>, <em>, <br> */
  body: string
  /** Optional quoted block (comment body, description, etc.) */
  quote?: {
    label: string  // e.g. "Comment by John Smith"
    html: string   // sanitised HTML content
  }
  /** Optional pill metadata below the body */
  meta?: Array<{ label: string; value: string }>
  ctaText: string
  ctaUrl: string
}

export function buildEmail(opts: EmailOptions): string {
  const { preheader, heading, body, quote, meta, ctaText, ctaUrl } = opts

  const metaHtml = meta && meta.length > 0
    ? `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:16px 0 4px;">
        <tr>
          ${meta.map(m =>
            `<td style="padding:0 8px 0 0;">
              <span style="display:inline-block;padding:4px 10px;background:#f3f4f6;border-radius:5px;font-size:12px;color:#374151;white-space:nowrap;">
                <span style="color:#9ca3af;">${m.label}:</span>&nbsp;${m.value}
              </span>
            </td>`
          ).join("")}
        </tr>
      </table>`
    : ""

  const quoteHtml = quote
    ? `<div style="margin:20px 0;border-left:3px solid #4f46e5;border-radius:0 6px 6px 0;background:#f8fafc;padding:14px 16px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">${quote.label}</p>
        <div style="font-size:14px;color:#374151;line-height:1.65;">${quote.html}</div>
      </div>`
    : ""

  const btnMarginTop = quote || meta ? "8px" : "24px"

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#f3f4f6;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ""}
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:600px;width:100%;">

          <!-- Brand bar -->
          <tr>
            <td style="background:#4f46e5;border-radius:12px 12px 0 0;padding:18px 28px;">
              <span style="font-size:15px;font-weight:700;color:#ffffff;letter-spacing:-0.2px;">&#9670;&nbsp;Meridian</span>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="background:#ffffff;padding:32px 32px 28px;">
              <h1 style="margin:0 0 10px;font-size:21px;font-weight:700;color:#111827;line-height:1.3;letter-spacing:-0.4px;">${heading}</h1>
              <p style="margin:0;font-size:15px;color:#374151;line-height:1.65;">${body}</p>
              ${metaHtml}
              ${quoteHtml}
              <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-top:${btnMarginTop};">
                <tr>
                  <td style="background:#4f46e5;border-radius:8px;" align="center">
                    <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;padding:11px 22px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:-0.1px;white-space:nowrap;">${ctaText}&nbsp;&rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border:1px solid #f3f4f6;border-top:none;border-radius:0 0 12px 12px;padding:16px 32px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                Sent by <strong style="color:#6b7280;">Meridian</strong>&nbsp;&middot;&nbsp;You received this because you're a member of this workspace.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ── Content helpers ───────────────────────────────────────────────────────────

/**
 * Prepare Tiptap-generated HTML for use inside an email quote block.
 * Converts @mention spans to styled text and strips unsafe/unknown tags.
 */
export function htmlToEmailSafe(html: string): string {
  if (!html) return ""
  return html
    // Mentions → @Name in indigo bold
    .replace(
      /<span[^>]*data-type="mention"[^>]*data-label="([^"]*)"[^>]*>[\s\S]*?<\/span>/g,
      '<strong style="color:#4f46e5;">@$1</strong>'
    )
    // Strip attributes from known safe block/inline tags
    .replace(/<(\/?(p|ul|ol|li|blockquote|h[1-6]|pre|code|strong|b|em|i|u|s|strike|br))\s[^>]*>/gi, "<$1>")
    // Remove all unknown tags (keep their text content)
    .replace(/<(?!\/?(?:p|ul|ol|li|blockquote|h[1-6]|pre|code|strong|b|em|i|u|s|strike|br)\b)[^>]+>/gi, "")
    .trim()
}

/** Derive a human-readable display name from a user object */
export function userDisplayName(user: any): string {
  const name = `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim()
  return name || user?.email || "Someone"
}

/** Title-case a snake_case string — e.g. "no_priority" → "No Priority" */
export function capitalize(str: string): string {
  if (!str) return ""
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Build a deep link to an issue, with graceful fallback */
export async function buildIssueUrl(container: any, appUrl: string, issue: any): Promise<string> {
  try {
    const projectService   = container.resolve("projectModuleService") as any
    const workspaceService = container.resolve("workspaceModuleService") as any
    const [project, workspace] = await Promise.all([
      projectService.retrieveProject(issue.project_id),
      workspaceService.retrieveWorkspace(issue.workspace_id),
    ])
    if (project?.identifier && workspace?.slug) {
      return `${appUrl}/${workspace.slug}/projects/${project.identifier}/issues/${issue.id}`
    }
  } catch { /* fall through */ }
  return `${appUrl}/issues/${issue.id}`
}

/** Build a deep link to a project */
export async function buildProjectUrl(
  container: any,
  appUrl: string,
  projectId: string,
  workspaceId: string
): Promise<string> {
  try {
    const projectService   = container.resolve("projectModuleService") as any
    const workspaceService = container.resolve("workspaceModuleService") as any
    const [project, workspace] = await Promise.all([
      projectService.retrieveProject(projectId),
      workspaceService.retrieveWorkspace(workspaceId),
    ])
    if (project?.identifier && workspace?.slug) {
      return `${appUrl}/${workspace.slug}/projects/${project.identifier}`
    }
  } catch { /* fall through */ }
  return `${appUrl}/projects/${projectId}`
}

// ── Legacy shim ───────────────────────────────────────────────────────────────

/** @deprecated Use buildEmail() for new subscribers */
export function emailHtml(message: string): string {
  return buildEmail({
    heading: "Meridian Notification",
    body: message,
    ctaText: "Open Meridian",
    ctaUrl: process.env.APP_URL ?? "http://localhost:9001",
  })
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
    return null
  }
}
