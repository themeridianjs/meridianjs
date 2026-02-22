import type { Response } from "express"

export const POST = async (req: any, res: Response) => {
  const authService = req.scope.resolve("authModuleService") as any
  const { email, password, first_name, last_name } = req.body

  if (!email || typeof email !== "string") {
    res.status(400).json({ error: { message: "email is required" } })
    return
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: { message: "password must be at least 8 characters" } })
    return
  }

  const result = await authService.register({ email, password, first_name, last_name })
  res.status(201).json(result)
}
