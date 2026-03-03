import type { Request, Response } from "express"

/**
 * GET /auth/setup
 * Public endpoint — no auth required.
 * Returns whether the app needs first-time setup (no users registered yet).
 */
export const GET = async (req: any, res: Response) => {
  let needsSetup = false
  try {
    const userService = req.scope.resolve("userModuleService") as any
    const count = await userService.countUsers()
    needsSetup = count === 0
  } catch {
    // userModuleService not configured — assume setup not needed
  }

  let googleOAuthEnabled = false
  try {
    req.scope.resolve("googleOAuthService")
    googleOAuthEnabled = true
  } catch {
    // googleOAuthService not registered — feature disabled
  }

  res.json({ needsSetup, googleOAuthEnabled })
}
