import { z } from "zod"
import type { Response } from "express"

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
})

export const POST = async (req: any, res: Response) => {
  // After the super-admin is created, registration is invite-only.
  // Direct calls to this endpoint are rejected; use POST /auth/invite/:token instead.
  const userService = req.scope.resolve("userModuleService") as any
  const userCount = await userService.countUsers()
  if (userCount > 0) {
    res.status(403).json({ error: { message: "Registration is invite-only. Use an invitation link to join." } })
    return
  }

  const result = registerSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({
      error: { message: "Validation error", details: result.error.flatten().fieldErrors },
    })
    return
  }

  const authService = req.scope.resolve("authModuleService") as any
  const response = await authService.register(result.data)
  res.status(201).json(response)
}
