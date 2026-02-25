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

/**
 * Starts the dashboard static server.
 * Injects window.__MERIDIAN_CONFIG__ into every HTML response so the dashboard
 * calls the API at the correct host:port directly from the browser.
 */
export function startDashboardServer(
  distDir: string,
  port: number,
  apiPort: number,
  apiHost = "localhost"
): Promise<http.Server> {
  const configScript = `<script>window.__MERIDIAN_CONFIG__ = { apiUrl: "http://${apiHost}:${apiPort}" };</script>`

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = (req.url ?? "/").split("?")[0]

      // Proxy /uploads/* requests to the API server so file attachments are served correctly
      if (urlPath.startsWith("/uploads/")) {
        const proxyReq = http.request(
          { host: apiHost, port: apiPort, path: req.url, method: req.method, headers: req.headers },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers)
            proxyRes.pipe(res)
          }
        )
        proxyReq.on("error", () => { res.writeHead(502); res.end("Bad Gateway") })
        req.pipe(proxyReq)
        return
      }

      // Resolve file path; fall back to index.html for unknown paths (SPA routing)
      let filePath = path.join(distDir, urlPath === "/" ? "index.html" : urlPath)
      if (!existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distDir, "index.html")
      }

      const ext = path.extname(filePath)

      // Inject config into HTML so the browser knows where the API is
      if (ext === ".html") {
        try {
          const html = fs.readFileSync(filePath, "utf-8")
          const injected = html.replace("<head>", `<head>\n    ${configScript}`)
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
          res.end(injected)
        } catch {
          res.writeHead(404)
          res.end("Not found")
        }
        return
      }

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
  console.log(chalk.dim(`     → API: http://localhost:${apiPort}`))

  const shutdown = () => { server.close(); process.exit(0) }
  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}
