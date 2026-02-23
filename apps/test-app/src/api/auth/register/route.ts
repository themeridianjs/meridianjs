import { z } from "zod"
import type { Response } from "express"

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
})

export const POST = async (req: any, res: Response) => {
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
