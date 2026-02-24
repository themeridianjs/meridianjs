import type { ILogger } from "@meridianjs/types"

export class ConsoleLogger implements ILogger {
  constructor(private readonly prefix: string = "meridian") {}

  private format(level: string, message: string, meta?: Record<string, unknown>): string {
    const ts = new Date().toISOString()
    const base = `[${ts}] [${level.toUpperCase()}] [${this.prefix}] ${message}`
    return meta ? `${base} ${JSON.stringify(meta)}` : base
  }

  info(message: string, meta?: Record<string, unknown>): void {
    console.log(this.format("info", message, meta))
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(this.format("warn", message, meta))
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(this.format("error", message, meta))
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.DEBUG) {
      console.debug(this.format("debug", message, meta))
    }
  }
}
