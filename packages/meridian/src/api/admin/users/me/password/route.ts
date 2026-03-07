import { z } from "zod"
import type { Response } from "express"
import { consumeOtp } from "./_otp-store.js"

const setPasswordSchema = z.object({
  otp: z.string().length(6, "Verification code must be 6 digits"),
  new_password: z.string().min(8, "Password must be at least 8 characters"),
})

/**
 * POST /admin/users/me/password
 * Set or change the authenticated user's password after OTP verification.
 */
export const POST = async (req: any, res: Response) => {
  const userId = req.user?.id as string
  if (!userId) {
    res.status(401).json({ error: { message: "Not authenticated" } })
    return
  }

  const result = setPasswordSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: { message: "Validation error", details: result.error.flatten().fieldErrors } })
    return
  }

  const valid = consumeOtp(userId, result.data.otp)
  if (!valid) {
    res.status(400).json({ error: { message: "Invalid or expired verification code" } })
    return
  }

  const authService = req.scope.resolve("authModuleService") as any
  await authService.setPassword(userId, result.data.new_password)
  res.json({ ok: true })
}
