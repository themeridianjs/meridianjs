import type { Response, NextFunction } from "express"
import { isGlobalAdmin } from "../../utils/project-access.js"

/** Fields exposed to non-admin members — enough for assignee/mention pickers. */
const MEMBER_VISIBLE_FIELDS = ["id", "email", "first_name", "last_name", "avatar_url", "designation"] as const

export const GET = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userService = req.scope.resolve("userModuleService") as any
    const limit = Math.min(Number(req.query.limit) || 20, 100)
    const offset = Number(req.query.offset) || 0
    const q = typeof req.query.q === "string" ? req.query.q.trim() : ""

    const filters: Record<string, unknown> = {}
    if (q) {
      filters.$or = [
        { email: { $ilike: `%${q}%` } },
        { first_name: { $ilike: `%${q}%` } },
        { last_name: { $ilike: `%${q}%` } },
      ]
    }

    const [users, count] = await userService.listAndCountUsers(filters, { limit, offset, orderBy: { created_at: "DESC" } })

    // Admins get full records (sans hash); members get only picker fields —
    // no phone numbers, OAuth ids, roles, metadata, or login timestamps.
    const safeUsers = isGlobalAdmin(req)
      ? (users as any[]).map(({ password_hash: _, ...u }) => u)
      : (users as any[]).map((u) =>
          Object.fromEntries(MEMBER_VISIBLE_FIELDS.map((f) => [f, u[f] ?? null]))
        )
    res.json({ users: safeUsers, count, limit, offset })
  } catch (err) {
    next(err)
  }
}
