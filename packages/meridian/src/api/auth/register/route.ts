import { z } from "zod"
import type { Response } from "express"
import { consumeOtp } from "./_otp-store.js"
import { validateEmailDomain } from "./_domain-check.js"

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  otp: z.string().length(6).optional(),
})

export const POST = async (req: any, res: Response) => {
  const userService = req.scope.resolve("userModuleService") as any
  const [, userCount] = await userService.listAndCountUsers({}, { limit: 1 })
  const isFirstSetup = userCount === 0

  if (!isFirstSetup) {
    const config = req.scope.resolve("config") as any
    const regConfig = config?.projectConfig?.registration
    if (!regConfig?.enabled) {
      res.status(403).json({
        error: { message: "Registration is closed. Ask an admin to send you an invitation link." },
      })
      return
    }

    // Validate domain before parsing full body (fast rejection)
    const emailRaw = req.body?.email
    if (emailRaw) {
      try {
        validateEmailDomain(emailRaw, regConfig.allowedDomains)
      } catch (err: any) {
        res.status(err.status ?? 422).json({ error: { message: err.message } })
        return
      }
    }

    if (!req.body?.otp) {
      res.status(400).json({ error: { message: "Verification code is required" } })
      return
    }
  }

  const result = registerSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: { message: "Validation error", details: result.error.flatten().fieldErrors } })
    return
  }

  if (!isFirstSetup) {
    const valid = consumeOtp(result.data.email.toLowerCase().trim(), result.data.otp!)
    if (!valid) {
      res.status(400).json({ error: { message: "Invalid or expired verification code" } })
      return
    }
  }

  const authService = req.scope.resolve("authModuleService") as any
  const response = await authService.register(result.data)
  res.status(201).json(response)
}
