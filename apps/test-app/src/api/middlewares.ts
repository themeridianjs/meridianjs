import { authenticateJWT } from "@meridian/auth"

/**
 * Route-level middleware configuration.
 *
 * Every request matching /admin/* must carry a valid Bearer JWT.
 * Public routes (/auth/*, /health, /ready) are not covered.
 */
export default {
  routes: [
    { matcher: "/admin", middlewares: [authenticateJWT] },
  ],
}
