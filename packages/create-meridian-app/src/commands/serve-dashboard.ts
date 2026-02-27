import path from "node:path"
import http from "node:http"
import fs from "node:fs"
import os from "node:os"
import { existsSync } from "node:fs"
import * as esbuild from "esbuild"
import type { Plugin } from "esbuild"
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
 * esbuild plugin that rewrites bare `react` / `react/jsx-runtime` imports to
 * use the React instance already loaded by the pre-built dashboard bundle,
 * exposed on `window.__React` and `window.__ReactJsxRuntime`.
 */
function makeReactWindowPlugin(): Plugin {
  return {
    name: "react-window",
    setup(build) {
      build.onResolve({ filter: /^react(\/.*)?$/ }, (args) => ({
        path: args.path,
        namespace: "react-window",
      }))

      build.onLoad({ filter: /.*/, namespace: "react-window" }, (args) => {
        if (args.path === "react/jsx-runtime") {
          return {
            contents: `
              const { jsx, jsxs, Fragment } = window.__ReactJsxRuntime;
              export { jsx, jsxs, Fragment };
            `,
            loader: "js",
          }
        }
        // Full react namespace forwarded from window.__React
        return {
          contents: `
            const R = window.__React;
            export default R;
            export const {
              createElement, createContext, cloneElement, isValidElement,
              useState, useEffect, useContext, useReducer, useCallback, useMemo,
              useRef, useImperativeHandle, useLayoutEffect, useDebugValue, useId,
              useDeferredValue, useTransition, startTransition,
              memo, forwardRef, lazy, Suspense, StrictMode, Fragment,
              Component, PureComponent, Children, createRef,
            } = R;
          `,
          loader: "js",
        }
      })
    },
  }
}

/**
 * Compile `src/admin/widgets/index.tsx` into a self-contained ESM bundle.
 * Returns the compiled source, or null if the entry point does not exist or
 * compilation fails.
 */
async function buildAdminExtensions(
  rootDir: string
): Promise<Buffer | null> {
  const entryPoint = path.join(rootDir, "src", "admin", "widgets", "index.tsx")
  if (!existsSync(entryPoint)) return null

  const outfile = path.join(os.tmpdir(), `meridian-ext-${Date.now()}.js`)
  try {
    await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      format: "esm",
      outfile,
      jsx: "automatic",
      plugins: [makeReactWindowPlugin()],
      logLevel: "silent",
    })
    const buf = fs.readFileSync(outfile)
    fs.unlinkSync(outfile)
    return buf
  } catch (err) {
    // Clean up temp file if it was created
    if (existsSync(outfile)) fs.unlinkSync(outfile)
    throw err
  }
}

/**
 * Starts the dashboard static server.
 * Injects window.__MERIDIAN_CONFIG__ into every HTML response so the dashboard
 * calls the API at the correct host:port directly from the browser.
 * If adminExtensionsBuf is provided it is served at /admin-extensions.js.
 */
export function startDashboardServer(
  distDir: string,
  port: number,
  apiPort: number,
  apiHost = "localhost",
  adminExtensionsBuf: Buffer | null = null
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

      // Serve compiled user extensions (or an empty module stub)
      if (urlPath === "/admin-extensions.js") {
        res.writeHead(200, { "Content-Type": "application/javascript" })
        res.end(adminExtensionsBuf ?? Buffer.from("export default [];\n"))
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

  // Compile user-defined admin extensions if present
  let adminExtensionsBuf: Buffer | null = null
  const extensionsEntry = path.join(rootDir, "src", "admin", "widgets", "index.tsx")
  if (existsSync(extensionsEntry)) {
    const extSpinner = chalk.dim("  → Compiling admin extensions…")
    process.stdout.write(extSpinner + "\r")
    try {
      adminExtensionsBuf = await buildAdminExtensions(rootDir)
      process.stdout.write(" ".repeat(extSpinner.length) + "\r")
      console.log(chalk.green("  ✔ Admin extensions compiled"))
    } catch (err) {
      process.stdout.write(" ".repeat(extSpinner.length) + "\r")
      console.warn(chalk.yellow("  ⚠ Admin extensions failed to compile:"), err)
    }
  }

  const server = await startDashboardServer(distDir, port, apiPort, "localhost", adminExtensionsBuf)

  console.log(chalk.green("  ✔ Admin dashboard: ") + chalk.cyan(`http://localhost:${port}`))
  console.log(chalk.dim(`     → API: http://localhost:${apiPort}`))
  if (adminExtensionsBuf) {
    console.log(chalk.dim(`     → Extensions: /admin-extensions.js (${adminExtensionsBuf.length} bytes)`))
  }

  const shutdown = () => { server.close(); process.exit(0) }
  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}
