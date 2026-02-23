import type { ZodSchema } from "zod"
import type { Request, Response, NextFunction } from "express"

/**
 * Express middleware that validates `req.body` against a Zod schema.
 *
 * On success, replaces `req.body` with the parsed (coerced/stripped) value
 * and calls `next()`.
 * On failure, responds 400 with a structured error including per-field details.
 *
 * @example
 * const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })
 * export const POST = [validate(loginSchema), handler]
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({
        error: {
          message: "Validation error",
          details: result.error.flatten().fieldErrors,
        },
      })
      return
    }
    req.body = result.data
    next()
  }
}
