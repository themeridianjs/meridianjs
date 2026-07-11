import { authenticate } from "@meridianjs/auth"
import { authRateLimit, oauthRateLimit, apiRateLimit } from "@meridianjs/framework"

/**
 * Route-level middleware configuration.
 *
 * /auth/login, /auth/register — strict 10 req/min (brute-force protection)
 * /auth/google                — loose 30 req/min (a full OAuth flow = 3 requests)
 * /admin/*                   — rate-limited + JWT or personal access token required
 *
 * Workspace/project isolation is enforced per-route via hasProjectAccess /
 * assertIssueAccess / getAccessibleWorkspaceIds — the deprecated
 * requireWorkspace guard was inert (JWTs carry workspaceId: null) and is
 * intentionally not listed here.
 */
export default {
  routes: [
    { matcher: "/auth/login",           middlewares: [authRateLimit] },
    { matcher: "/auth/register",        middlewares: [authRateLimit] },
    { matcher: "/auth/forgot-password", middlewares: [authRateLimit] },
    { matcher: "/auth/reset-password",  middlewares: [authRateLimit] },
    { matcher: "/auth/google",          middlewares: [oauthRateLimit] },
    { matcher: "/auth/invite",          middlewares: [authRateLimit] },
    { matcher: "/admin",         middlewares: [apiRateLimit, authenticate] },
  ],
}
