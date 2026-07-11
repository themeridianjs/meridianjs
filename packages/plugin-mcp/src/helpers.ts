import { PRIVILEGED_ROLES } from "@meridianjs/types"

/** Per-request context every tool closes over. */
export interface McpToolContext {
  /** Request-scoped DI container (req.scope). */
  scope: any
  /** Authenticated principal (req.user) — JWT session or PAT. */
  user: any
}

/**
 * The shared access helpers from @meridianjs/meridian (hasProjectAccess,
 * getAccessibleWorkspaceIds) take an Express req but only read scope/user —
 * this adapter lets MCP tools reuse them unchanged.
 */
export function asReqLike(ctx: McpToolContext) {
  return { scope: ctx.scope, user: ctx.user }
}

export function hasPermission(ctx: McpToolContext, permission: string): boolean {
  const roles: string[] = ctx.user?.roles ?? []
  if (roles.some((r) => PRIVILEGED_ROLES.includes(r))) return true
  const permissions: string[] = ctx.user?.permissions ?? []
  return permissions.includes(permission)
}

/** Whether the principal may call mutating tools. JWT sessions always can. */
export function canWrite(ctx: McpToolContext): boolean {
  if (ctx.user?.authType !== "api-token") return true
  const scopes: string[] = ctx.user?.tokenScopes ?? []
  return scopes.includes("write")
}

export function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] }
}

export function err(message: string) {
  return { isError: true as const, content: [{ type: "text" as const, text: message }] }
}

/** Maps a reverted workflow result to a tool error message. */
export function workflowError(errors: any[], fallback: string): string {
  const first = errors?.[0]
  const message = first?.message ?? (typeof first === "string" ? first : null)
  return message ? `${fallback}: ${message}` : fallback
}
