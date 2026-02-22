import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express"
import cors from "cors"
import type { MeridianConfig, MeridianContainer, ILogger } from "@meridian/types"

export function createServer(
  container: MeridianContainer,
  config: MeridianConfig
): Express {
  const app = express()
  const logger = container.resolve<ILogger>("logger")

  // ── Middleware ─────────────────────────────────────────────────────────────

  // Parse JSON bodies (up to 10mb for attachments)
  app.use(express.json({ limit: "10mb" }))
  app.use(express.urlencoded({ extended: true, limit: "10mb" }))

  // CORS
  const corsOrigin = config.projectConfig.cors?.origin ?? "*"
  app.use(
    cors({
      origin: corsOrigin,
      credentials: config.projectConfig.cors?.credentials ?? false,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  )

  // Attach a request-scoped DI container to every request
  app.use((req: any, _res: Response, next: NextFunction) => {
    req.scope = container.createScope()
    next()
  })

  // ── Health check ───────────────────────────────────────────────────────────

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ ok: true, timestamp: new Date().toISOString() })
  })

  app.get("/ready", (_req: Request, res: Response) => {
    res.json({ ok: true })
  })

  // ── Global error handler ───────────────────────────────────────────────────

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status ?? err.statusCode ?? 500
    const message = err.message ?? "Internal Server Error"

    if (status >= 500) {
      logger.error(`Unhandled error: ${message}`, {
        stack: err.stack,
        status,
      })
    }

    res.status(status).json({
      error: {
        message,
        type: err.type ?? err.name ?? "Error",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
      },
    })
  })

  return app
}
