import { z } from "zod"
import type { Response } from "express"
import { generateAndStoreOtp } from "../_otp-store.js"
import { validateEmailDomain } from "../_domain-check.js"

const schema = z.object({
  email: z.string().email(),
})

export const POST = async (req: any, res: Response) => {
  const config = req.scope.resolve("config") as any
  const regConfig = config?.projectConfig?.registration

  if (!regConfig?.enabled) {
    res.status(403).json({ error: { message: "Registration is closed." } })
    return
  }

  const result = schema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: { message: "Invalid email address" } })
    return
  }

  const { email } = result.data

  try {
    validateEmailDomain(email, regConfig.allowedDomains)
  } catch (err: any) {
    res.status(err.status ?? 422).json({ error: { message: err.message } })
    return
  }

  // If user already exists, return 200 silently (no enumeration)
  try {
    const userService = req.scope.resolve("userModuleService") as any
    const existing = await userService.retrieveUserByEmail(email.toLowerCase().trim())
    if (existing) {
      res.json({ ok: true })
      return
    }
  } catch {
    // user service error — fall through to OTP generation
  }

  let otp: string
  try {
    otp = generateAndStoreOtp(email.toLowerCase().trim())
  } catch {
    // Rate limited — still return 200 to avoid timing-based enumeration
    res.json({ ok: true })
    return
  }

  try {
    const eventBus = req.scope.resolve("eventBus") as any
    await eventBus.emit({ name: "registration.otp_requested", data: { email, otp } })
  } catch {
    // Non-fatal — OTP is stored, email may not send
  }

  res.json({ ok: true })
}
