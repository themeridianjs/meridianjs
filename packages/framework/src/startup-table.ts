import fs from "node:fs"
import type { MeridianConfig } from "@meridianjs/types"
import { cyan, white, dim, bold } from "./colors.js"

interface StartupTableOptions {
  config: MeridianConfig
  elapsedMs: number
}

function readFrameworkVersion(): string {
  try {
    const pkgPath = new URL("../package.json", import.meta.url)
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))
    return pkg.version ?? "unknown"
  } catch {
    return "unknown"
  }
}

function parseDatabaseUrl(url: string): { host: string; name: string } {
  try {
    const parsed = new URL(url)
    const host = `${parsed.hostname}:${parsed.port || "5432"}`
    const name = parsed.pathname.replace(/^\//, "") || "unknown"
    return { host, name }
  } catch {
    return { host: "unknown", name: "unknown" }
  }
}

export function printStartupTable({ config, elapsedMs }: StartupTableOptions): void {
  const frameworkVersion = readFrameworkVersion()
  const nodeVersion = process.version
  const env = process.env.NODE_ENV || "development"
  const pid = process.pid
  const now = new Date().toLocaleTimeString()
  const db = parseDatabaseUrl(config.projectConfig.databaseUrl)
  const port = config.projectConfig.httpPort ?? 9000

  const rows: [string, string][] = [
    ["Time", now],
    ["Launched in", `${elapsedMs} ms`],
    ["Environment", env],
    ["Process PID", String(pid)],
    ["Version", `${frameworkVersion} (node ${nodeVersion})`],
    ["Database", `${db.host} ${dim("(" + db.name + ")")}`],
    ["Port", String(port)],
  ]

  // Calculate column widths
  const labelWidth = Math.max(...rows.map(([l]) => l.length)) + 2
  const valueWidth = Math.max(...rows.map(([, v]) => stripAnsi(v).length)) + 2
  const totalWidth = labelWidth + valueWidth + 3 // 3 = │ separator + 2 borders

  const hLine = "─".repeat(labelWidth)
  const hLine2 = "─".repeat(valueWidth)

  const lines: string[] = []
  lines.push(dim(`┌${hLine}┬${hLine2}┐`))

  for (let i = 0; i < rows.length; i++) {
    const [label, value] = rows[i]
    const labelPad = label.padEnd(labelWidth)
    const valuePad = padEnd(value, valueWidth)
    lines.push(`${dim("│")}${cyan(labelPad)}${dim("│")}${white(valuePad)}${dim("│")}`)
  }

  lines.push(dim(`└${hLine}┴${hLine2}┘`))

  process.stdout.write("\n" + lines.join("\n") + "\n\n")
}

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "")
}

function padEnd(s: string, width: number): string {
  const visible = stripAnsi(s).length
  return s + " ".repeat(Math.max(0, width - visible))
}
