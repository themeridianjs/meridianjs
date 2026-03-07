const enabled = process.stdout.isTTY !== false && !process.env.NO_COLOR

const wrap = (code: string, reset: string) =>
  enabled ? (s: string) => `${code}${s}${reset}` : (s: string) => s

export const green = wrap("\x1b[32m", "\x1b[39m")
export const cyan  = wrap("\x1b[36m", "\x1b[39m")
export const yellow = wrap("\x1b[33m", "\x1b[39m")
export const red   = wrap("\x1b[31m", "\x1b[39m")
export const blue  = wrap("\x1b[34m", "\x1b[39m")
export const white = wrap("\x1b[37m", "\x1b[39m")
export const dim   = wrap("\x1b[2m", "\x1b[22m")
export const bold  = wrap("\x1b[1m", "\x1b[22m")
