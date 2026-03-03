import type { ModuleDefinition } from "@meridianjs/types"
import { GoogleOAuthService } from "./service.js"

export { GoogleOAuthService }
export type { GoogleOAuthOptions, GoogleProfile } from "./service.js"

const GoogleOAuthModule: ModuleDefinition = {
  key: "googleOAuthService",
  service: GoogleOAuthService as any,
}

export default GoogleOAuthModule
