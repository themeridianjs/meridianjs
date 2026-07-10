import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
import helmet from "helmet"
import type { MeridianConfig, MeridianContainer, ILogger } from "@meridianjs/types"
import { runInOrmContext } from "@meridianjs/framework-utils"
import { httpLoggerMiddleware } from "./http-logger.js"

export function createServer(
  container: MeridianContainer,
  config: MeridianConfig
): Express {
  const app = express()
  // Trust proxy hops so req.ip reflects the real client IP — required for rate
  // limiters to key by client IP when running behind nginx, ALB, Cloudflare, etc.
  // Configurable because a wrong hop count lets clients spoof X-Forwarded-For.
  app.set("trust proxy", config.projectConfig.trustProxy ?? 1)
  const logger = container.resolve<ILogger>("logger")

  // ── Middleware ─────────────────────────────────────────────────────────────

  // Parse JSON bodies (up to 10mb for attachments)
  app.use(express.json({ limit: "10mb" }))
  app.use(express.urlencoded({ extended: true, limit: "10mb" }))
  app.use(cookieParser())

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }))

  // HTTP request logging
  app.use(httpLoggerMiddleware())

  // CORS
  const corsOrigin = config.projectConfig.cors?.origin ?? "*"

  if (corsOrigin === "*" && process.env.NODE_ENV === "production") {
    logger.warn(
      "CORS origin is set to '*' in production. " +
      "Set projectConfig.cors.origin to a specific domain to restrict cross-origin access."
    )
  }

  app.use(
    cors({
      origin: corsOrigin,
      credentials: config.projectConfig.cors?.credentials ?? false,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
      maxAge: 86400,
    })
  )

  // Attach a request-scoped DI container to every request and dispose it once.
  app.use((req: any, res: Response, next: NextFunction) => {
    req.scope = container.createScope()
    let disposed = false
    const dispose = () => {
      if (disposed) return
      disposed = true
      req.scope.dispose?.()
    }
    res.on("finish", dispose)
    res.on("close", dispose)
    next()
  })

  // Establish a per-request EntityManager context so every module's
  // repositories resolve an isolated EM fork for this request (see
  // @meridianjs/framework-utils orm-context). Without this, concurrent
  // requests would share one identity map and unit-of-work state.
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    runInOrmContext(() => next())
  })

  // ── Health check ───────────────────────────────────────────────────────────

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ ok: true, timestamp: new Date().toISOString() })
  })

  app.get("/ready", (_req: Request, res: Response) => {
    res.json({ ok: true })
  })

  return app
}

/**
 * Registers the JSON 404 catch-all and the global error handler.
 *
 * Must be called AFTER every route source has been mounted (file-based routes,
 * plugins, middlewares) — Express only routes errors to handlers registered
 * after the layer that threw.
 */
export function registerErrorHandling(app: Express, logger: ILogger): void {
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: {
        message: `Route not found: ${req.method} ${req.path}`,
        type: "NotFoundError",
      },
    })
  })

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status ?? err.statusCode ?? 500
    const message = err.message ?? "Internal Server Error"

    if (status >= 500) {
      logger.error(`Unhandled error: ${message}`, {
        stack: err.stack,
        status,
      })
    }

    if (res.headersSent) {
      return
    }

    res.status(status).json({
      error: {
        message,
        type: err.type ?? err.name ?? "Error",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
      },
    })
  })
}
