import type { RequestHandler } from "express"

export interface MiddlewareRoute {
  matcher: string | RegExp
  middlewares: RequestHandler[]
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "ALL"
}

export interface MiddlewaresConfig {
  routes: MiddlewareRoute[]
}

/**
 * Type-safe helper for defining API middleware configuration.
 *
 * @example
 * // src/api/middlewares.ts
 * import { defineMiddlewares } from "@meridianjs/framework"
 * import { authenticateJWT } from "@meridianjs/auth"
 *
 * export default defineMiddlewares({
 *   routes: [
 *     { matcher: "/admin*", middlewares: [authenticateJWT()] },
 *   ],
 * })
 */
export function defineMiddlewares(config: MiddlewaresConfig): MiddlewaresConfig {
  return config
}
