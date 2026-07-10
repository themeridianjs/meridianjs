import type { Request } from "express"
import type { MeridianContainer } from "@meridianjs/types"

/**
 * The authenticated request shape shared by all /admin routes.
 *
 * `req.user` is populated by authenticateJWT; `req.scope` is the per-request
 * Awilix container. Routes are written against `any` today — prefer this type
 * on new/edited handlers so service lookups and req.user access are checked.
 */
export interface AuthenticatedUser {
  id: string
  workspaceId: string | null
  roles: string[]
  permissions: string[]
}

export interface MeridianRequest extends Request {
  user?: AuthenticatedUser
  scope: MeridianContainer
}

/**
 * Resolve a module service from the request scope with a return type.
 * Replaces the pervasive `req.scope.resolve("xService") as any`.
 *
 * @example
 * const issues = resolveService<IssueModuleService>(req, "issueModuleService")
 */
export function resolveService<T = any>(req: { scope: MeridianContainer }, token: string): T {
  return req.scope.resolve(token) as T
}
