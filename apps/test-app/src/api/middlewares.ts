import { authenticateJWT, requireWorkspace } from "@meridian/auth"
import { authRateLimit, apiRateLimit } from "@meridian/framework"

/**
 * Route-level middleware configuration.
 *
 * /auth/* — rate-limited to 10 req/min (brute-force protection)
 * /admin/* — rate-limited + JWT required + workspace isolation
 */
export default {
  routes: [
    { matcher: "/auth",  middlewares: [authRateLimit] },
    { matcher: "/admin", middlewares: [apiRateLimit, authenticateJWT, requireWorkspace] },
  ],
}
