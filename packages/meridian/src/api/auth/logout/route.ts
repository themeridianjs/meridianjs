import type { Response } from "express"
import jwt from "jsonwebtoken"
import type { MeridianConfig } from "@meridianjs/types"

export const POST = async (req: any, res: Response) => {
  const authHeader = req.headers.authorization as string | undefined
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : undefined

  if (token) {
    try {
      const config = req.scope.resolve("config") as MeridianConfig
      const payload = jwt.verify(token, config.projectConfig.jwtSecret) as any
      if (payload.jti) {
        const userService = req.scope.resolve("userModuleService") as any
        await userService.revokeSession(payload.jti).catch(() => {})
      }
    } catch {
      // Expired or invalid token — nothing to revoke, still return success
    }
  }

  res.json({ ok: true })
}
