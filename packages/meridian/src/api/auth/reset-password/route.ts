import { z } from "zod"
import type { Response } from "express"

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

/**
 * POST /auth/reset-password
 * Reset password using a valid reset token.
 */
export const POST = async (req: any, res: Response) => {
  const result = resetPasswordSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: { message: "Validation error", details: result.error.flatten().fieldErrors } })
    return
  }

  const authService = req.scope.resolve("authModuleService") as any
  await authService.resetPassword(result.data.token, result.data.password)
  res.json({ ok: true, message: "Password has been reset. You can now sign in." })
}
