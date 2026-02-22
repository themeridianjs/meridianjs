import type { Response } from "express"

export const POST = async (req: any, res: Response) => {
  const authService = req.scope.resolve("authModuleService") as any
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ error: { message: "email and password are required" } })
    return
  }

  const result = await authService.login({ email, password })
  res.json(result)
}
