import type { Response } from "express"
import { generateAndStoreOtp } from "../_otp-store.js"

/**
 * POST /admin/users/me/password/send-otp
 * Send a 6-digit OTP to the authenticated user's email for password create/change.
 */
export const POST = async (req: any, res: Response) => {
  const userId = req.user?.id as string
  if (!userId) {
    res.status(401).json({ error: { message: "Not authenticated" } })
    return
  }

  let otp: string
  try {
    otp = generateAndStoreOtp(userId)
  } catch (err: any) {
    // Rate-limited — still return 200 to avoid leaking timing info
    res.json({ ok: true })
    return
  }

  const userService = req.scope.resolve("userModuleService") as any
  const user = await userService.retrieveUser(userId)

  const eventBus = req.scope.resolve("eventBus") as any
  await eventBus.emit({
    name: "password.otp_requested",
    data: { user_id: userId, email: user.email, otp },
  })

  res.json({ ok: true })
}
