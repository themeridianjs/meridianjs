import type { ZodSchema } from "zod"
import type { Request, Response, NextFunction } from "express"

export type ValidateTarget = "body" | "query" | "params"

/**
 * Express middleware that validates part of the request against a Zod schema.
 *
 * On success, replaces the target (default `req.body`) with the parsed
 * (coerced/stripped) value and calls `next()`.
 * On failure, responds 400 with a structured error including per-field details.
 *
 * @example
 * const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })
 * export const middlewares = [validate(loginSchema)]
 * export const POST = handler
 *
 * @example
 * export const middlewares = [validate(listQuerySchema, "query")]
 */
export function validate(schema: ZodSchema, target: ValidateTarget = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target])
    if (!result.success) {
      res.status(400).json({
        error: {
          message: "Validation error",
          target,
          details: result.error.flatten().fieldErrors,
        },
      })
      return
    }
    // Express 5 exposes req.query via a getter; assign defensively.
    try {
      ;(req as any)[target] = result.data
    } catch {
      Object.defineProperty(req, target, { value: result.data, writable: true })
    }
    next()
  }
}
