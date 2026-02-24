import { z } from "zod"
import type { Response } from "express"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const POST = async (req: any, res: Response) => {
  const result = loginSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: { message: "Validation error", details: result.error.flatten().fieldErrors } })
    return
  }
  const authService = req.scope.resolve("authModuleService") as any
  const response = await authService.login(result.data)
  res.json(response)
}
