import { authenticateJWT, requireWorkspace } from "@meridianjs/auth"
import { authRateLimit, oauthRateLimit, apiRateLimit } from "@meridianjs/framework"

/**
 * Route-level middleware configuration.
 *
 * /auth/login, /auth/register — strict 10 req/min (brute-force protection)
 * /auth/google                — loose 30 req/min (a full OAuth flow = 3 requests)
 * /admin/*                   — rate-limited + JWT required + workspace isolation
 */
export default {
  routes: [
    { matcher: "/auth/login",           middlewares: [authRateLimit] },
    { matcher: "/auth/register",        middlewares: [authRateLimit] },
    { matcher: "/auth/forgot-password", middlewares: [authRateLimit] },
    { matcher: "/auth/reset-password",  middlewares: [authRateLimit] },
    { matcher: "/auth/google",          middlewares: [oauthRateLimit] },
    { matcher: "/admin",         middlewares: [apiRateLimit, authenticateJWT, requireWorkspace] },
  ],
}
