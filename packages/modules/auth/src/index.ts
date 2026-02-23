import { Module } from "@meridian/framework-utils"
import { AuthModuleService } from "./service.js"

export const AUTH_MODULE = "authModuleService"

// Auth module has no models or loaders of its own.
// It delegates user storage to the userModuleService.
export default Module(AUTH_MODULE, {
  service: AuthModuleService,
})

export { AuthModuleService }
export { authenticateJWT } from "./middleware.js"
export { requireRoles, requireWorkspace } from "./guards.js"
export type { RegisterInput, LoginInput, AuthResult, JwtPayload } from "./service.js"
