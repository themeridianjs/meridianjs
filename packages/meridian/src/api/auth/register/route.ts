import { z } from "zod"
import type { Response } from "express"

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
})

export const POST = async (req: any, res: Response) => {
  // Registration is only open for the very first user (super-admin setup).
  // All subsequent accounts must be created via an invitation link.
  const userService = req.scope.resolve("userModuleService") as any
  const [, userCount] = await userService.listAndCountUsers({}, { limit: 1 })
  if (userCount > 0) {
    res.status(403).json({
      error: { message: "Registration is closed. Ask an admin to send you an invitation link." },
    })
    return
  }

  const result = registerSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: { message: "Validation error", details: result.error.flatten().fieldErrors } })
    return
  }
  const authService = req.scope.resolve("authModuleService") as any
  const response = await authService.register(result.data)
  res.status(201).json(response)
}
