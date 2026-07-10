import { format } from "date-fns"

/**
 * Format an ISO timestamp as its UTC calendar date. Server-side date filters
 * compare in UTC, so rendering the UTC day (instead of the local day) keeps
 * the table consistent with the range filter and avoids the off-by-one-day
 * shift for viewers west of UTC on midnight-stored dates.
 */
export function formatUtcDate(iso: string, fmt = "MMM d, yyyy"): string {
  const d = new Date(iso)
  return format(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), fmt)
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function formatElapsed(startedAt: string): string {
  const elapsedMs = Date.now() - new Date(startedAt).getTime()
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const mm = String(m).padStart(2, "0")
  const ss = String(s).padStart(2, "0")
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}
