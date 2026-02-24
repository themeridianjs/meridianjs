import type { Request, Response } from "express"

/**
 * GET /auth/setup
 * Public endpoint — no auth required.
 * Returns whether the app needs first-time setup (no users registered yet).
 */
export const GET = async (req: any, res: Response) => {
  try {
    const userService = req.scope.resolve("userModuleService") as any
    const count = await userService.countUsers()
    res.json({ needsSetup: count === 0 })
  } catch {
    // userModuleService not configured — assume setup not needed
    res.json({ needsSetup: false })
  }
}
