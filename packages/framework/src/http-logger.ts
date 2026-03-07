import type { Request, Response, NextFunction } from "express"
import { green, cyan, yellow, red, dim } from "./colors.js"

function colorStatus(status: number): string {
  if (status >= 500) return red(String(status))
  if (status >= 400) return yellow(String(status))
  if (status >= 300) return cyan(String(status))
  return green(String(status))
}

function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n)
}

function pad3(n: number): string {
  if (n < 10) return "00" + n
  if (n < 100) return "0" + n
  return String(n)
}

function timestamp(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad3(d.getMilliseconds())}`
}

export function httpLoggerMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now()
    res.on("finish", () => {
      const duration = Date.now() - start
      const line = `[${timestamp()}] ${green("http:")} ${req.method} ${req.originalUrl} ${dim(`(${duration} ms)`)} ${colorStatus(res.statusCode)}\n`
      process.stdout.write(line)
    })
    next()
  }
}
