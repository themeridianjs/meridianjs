import path from "node:path"
import http from "node:http"
import fs from "node:fs"
import { existsSync } from "node:fs"
import chalk from "chalk"
import { findProjectRoot, readProjectPorts } from "../utils.js"

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript",
  ".mjs":  "application/javascript",
  ".css":  "text/css",
  ".json": "application/json",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
}

/** Paths that should be proxied to the API server instead of served as static files. */
const API_PATHS = ["/admin", "/auth", "/uploads", "/health"]

function isApiRequest(urlPath: string): boolean {
  return API_PATHS.some(p => urlPath === p || urlPath.startsWith(p + "/") || urlPath.startsWith(p + "?"))
}

function proxyToApi(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  apiHost: string,
  apiPort: number
): void {
  const proxyReq = http.request(
    { hostname: apiHost, port: apiPort, path: req.url, method: req.method,
      headers: { ...req.headers, host: `${apiHost}:${apiPort}` } },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode!, proxyRes.headers as http.OutgoingHttpHeaders)
      proxyRes.pipe(res, { end: true })
    }
  )
  proxyReq.on("error", () => {
    if (!res.headersSent) res.writeHead(502)
    res.end("API unavailable")
  })
  req.pipe(proxyReq, { end: true })
}

/**
 * Starts the dashboard static server with API proxy.
 * - API paths (/admin, /auth, /uploads, /health) are proxied to the API server
 * - Static assets are served from distDir
 * - All other paths fall back to index.html (SPA routing)
 */
export function startDashboardServer(
  distDir: string,
  port: number,
  apiPort: number,
  apiHost = "127.0.0.1"
): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = (req.url ?? "/").split("?")[0]

      // Proxy API calls through to the API server
      if (isApiRequest(urlPath)) {
        proxyToApi(req, res, apiHost, apiPort)
        return
      }

      // Serve static assets
      let filePath = path.join(distDir, urlPath === "/" ? "index.html" : urlPath)
      if (!existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distDir, "index.html")  // SPA fallback
      }

      const ext = path.extname(filePath)
      const contentType = MIME_TYPES[ext] ?? "application/octet-stream"

      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end("Not found"); return }
        res.writeHead(200, { "Content-Type": contentType })
        res.end(data)
      })
    })

    server.listen(port, () => resolve(server))
    server.on("error", reject)
  })
}

/** CLI command: `meridian serve-dashboard [--port <n>]` */
export async function runServeDashboard(portOverride?: number): Promise<void> {
  const rootDir = findProjectRoot()
  if (!rootDir) {
    console.error(chalk.red("  ✖ Could not find meridian.config.ts. Are you inside a Meridian project?"))
    process.exit(1)
  }

  const distDir = path.join(rootDir, "node_modules", "@meridianjs", "admin-dashboard", "dist")
  if (!existsSync(distDir)) {
    console.error(chalk.red("  ✖ Admin dashboard not installed."))
    console.error(chalk.dim("  Run: npm install @meridianjs/admin-dashboard"))
    process.exit(1)
  }

  const { apiPort, dashboardPort } = await readProjectPorts(rootDir)
  const port = portOverride ?? dashboardPort

  const server = await startDashboardServer(distDir, port, apiPort)

  console.log(chalk.green("  ✔ Admin dashboard: ") + chalk.cyan(`http://localhost:${port}`))
  console.log(chalk.dim(`     → API proxy: http://localhost:${apiPort}`))

  const shutdown = () => { server.close(); process.exit(0) }
  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}
