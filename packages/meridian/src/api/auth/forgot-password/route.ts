import { z } from "zod"
import type { Response } from "express"

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

/**
 * POST /auth/forgot-password
 * Request a password reset link. Always returns 200 to prevent email enumeration.
 */
export const POST = async (req: any, res: Response) => {
  const result = forgotPasswordSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: { message: "Validation error", details: result.error.flatten().fieldErrors } })
    return
  }

  const authService = req.scope.resolve("authModuleService") as any
  const resetInfo = await authService.requestPasswordReset(result.data.email)

  // Emit event for email subscriber — but always return 200
  if (resetInfo) {
    try {
      const eventBus = req.scope.resolve("eventBus") as any
      await eventBus.emit({
        name: "password.reset_requested",
        data: {
          user_id: resetInfo.userId,
          email: resetInfo.email,
          token: resetInfo.token,
        },
      })
    } catch {
      // Non-fatal — reset was generated, email delivery is best-effort
    }
  }

  res.json({ ok: true, message: "If an account exists with that email, a reset link has been sent." })
}
