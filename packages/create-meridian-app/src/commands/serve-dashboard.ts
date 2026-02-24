import path from "node:path"
import http from "node:http"
import fs from "node:fs"
import { existsSync } from "node:fs"
import chalk from "chalk"
import { findProjectRoot } from "../utils.js"

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
 * Starts a static file server for the admin dashboard dist directory.
 * All unknown paths fall back to index.html (SPA routing).
 */
export function startDashboardServer(distDir: string, port: number): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = (req.url ?? "/").split("?")[0]
      let filePath = path.join(distDir, urlPath === "/" ? "index.html" : urlPath)

      if (!existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distDir, "index.html")
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

/** CLI command: `meridian serve-dashboard [--port 5174]` */
export async function runServeDashboard(port = 5174): Promise<void> {
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

  const server = await startDashboardServer(distDir, port)
  console.log(chalk.green("  ✔ Admin dashboard running on ") + chalk.cyan(`http://localhost:${port}`))

  const shutdown = () => { server.close(); process.exit(0) }
  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}
