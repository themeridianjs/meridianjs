import path from "node:path"
import os from "node:os"
import { randomBytes } from "node:crypto"
import fs from "node:fs/promises"
import { existsSync } from "node:fs"
import { execa } from "execa"

/** Convert kebab-case or snake_case to PascalCase */
export function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (_, c: string) => c.toUpperCase())
}

/** Convert PascalCase or camelCase to kebab-case */
export function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "")
}

/** Write a file, creating parent directories if needed */
export async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, "utf-8")
}

/** Create an empty directory */
export async function mkdir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true })
}

/** Create a .gitkeep in a directory so it's tracked by git */
export async function mkdirWithKeep(dirPath: string): Promise<void> {
  await mkdir(dirPath)
  await writeFile(path.join(dirPath, ".gitkeep"), "")
}

/** Resolve the project root by walking up from cwd until meridian.config.ts is found */
export function findProjectRoot(startDir: string = process.cwd()): string | null {
  let dir = startDir
  while (true) {
    if (existsSync(path.join(dir, "meridian.config.ts"))) {
      return dir
    }
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

/**
 * Reads httpPort and admin.port from the project's meridian.config.ts by
 * spawning a tiny inline script (avoids bootstrapping the full framework).
 */
export async function readProjectPorts(rootDir: string): Promise<{ apiPort: number; dashboardPort: number }> {
  const defaults = { apiPort: 9000, dashboardPort: 5174 }
  const configPath = path.join(rootDir, "meridian.config.ts")
  if (!existsSync(configPath)) return defaults

  const script = `
import cfg from "${configPath.replace(/\\/g, "/")}"
const c = cfg.default ?? cfg
process.stdout.write(JSON.stringify({
  apiPort: c?.projectConfig?.httpPort ?? 9000,
  dashboardPort: c?.admin?.port ?? 5174,
}))
`
  const scriptPath = path.join(os.tmpdir(), `meridian-ports-${randomBytes(8).toString("hex")}.mjs`)
  await fs.writeFile(scriptPath, script, { encoding: "utf-8", mode: 0o600 })
  try {
    const result = await execa("node", ["--import", "tsx/esm", scriptPath], { cwd: rootDir })
    return JSON.parse(result.stdout)
  } catch {
    return defaults
  } finally {
    await fs.unlink(scriptPath).catch(() => null)
  }
}

/** Format duration in ms into a human-readable string */
export function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
