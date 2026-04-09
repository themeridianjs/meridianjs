import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format } from "date-fns"
import type { TimeLog } from "@/api/hooks/useTimeLogs"

export const WORKING_HOURS_PER_DAY = 8
export const WORKING_MINUTES_PER_DAY = WORKING_HOURS_PER_DAY * 60

/**
 * Format minutes as "Xw Xd Xh Xm" (long human-readable form for summaries).
 * Assumes 8h/day, 5d/week.
 */
export function formatMinutesLong(minutes: number): string {
  if (minutes <= 0) return "0h"

  const totalHours = Math.floor(minutes / 60)
  const remainderMinutes = minutes % 60
  const weeks = Math.floor(totalHours / (WORKING_HOURS_PER_DAY * 5))
  const afterWeeks = totalHours % (WORKING_HOURS_PER_DAY * 5)
  const days = Math.floor(afterWeeks / WORKING_HOURS_PER_DAY)
  const hours = afterWeeks % WORKING_HOURS_PER_DAY

  const parts: string[] = []
  if (weeks > 0) parts.push(`${weeks}w`)
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (remainderMinutes > 0 && weeks === 0) parts.push(`${remainderMinutes}m`)

  return parts.length > 0 ? parts.join(" ") : "0h"
}

/**
 * Build calendar grid dates for a given month.
 * Returns 35 or 42 Date objects starting from Sunday before the 1st.
 */
export function getMonthGridDates(year: number, month: number): Date[] {
  const monthStart = startOfMonth(new Date(year, month))
  const monthEnd = endOfMonth(new Date(year, month))
  const gridStart = startOfWeek(monthStart) // Sunday
  const gridEnd = endOfWeek(monthEnd) // Saturday

  return eachDayOfInterval({ start: gridStart, end: gridEnd })
}

/**
 * Build week grid dates for the week containing the given date.
 * Returns 7 Date objects (Sun–Sat).
 */
export function getWeekGridDates(date: Date): Date[] {
  const weekStart = startOfWeek(date) // Sunday
  const weekEnd = endOfWeek(date) // Saturday
  return eachDayOfInterval({ start: weekStart, end: weekEnd })
}

/**
 * Group time logs by logged_date into a Map<"YYYY-MM-DD", TimeLog[]>.
 */
export function groupLogsByDate(logs: TimeLog[]): Map<string, TimeLog[]> {
  const map = new Map<string, TimeLog[]>()
  for (const log of logs) {
    if (!log.logged_date) continue
    // logged_date may come as "YYYY-MM-DD" or full ISO — take first 10 chars
    const key = log.logged_date.slice(0, 10)
    const arr = map.get(key)
    if (arr) arr.push(log)
    else map.set(key, [log])
  }
  return map
}

/**
 * Deterministic color from a project identifier string.
 * Returns a Tailwind color class name for chip styling.
 */
const CHIP_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
]

export function projectIdentifierToColor(identifier: string): string {
  let hash = 0
  for (let i = 0; i < identifier.length; i++) {
    hash = ((hash << 5) - hash + identifier.charCodeAt(i)) | 0
  }
  return CHIP_COLORS[Math.abs(hash) % CHIP_COLORS.length]
}

/**
 * Format a date as "YYYY-MM-DD" for API queries.
 */
export function toDateString(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

/**
 * Parse a duration string like "2h 30m", "2h", "30m", "2.5h" into minutes.
 * Returns null if unparseable.
 */
export function parseDuration(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Try pure number (treat as hours)
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Math.round(parseFloat(trimmed) * 60)
  }

  let totalMinutes = 0
  let matched = false

  // Match hours
  const hMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*h/i)
  if (hMatch) {
    totalMinutes += Math.round(parseFloat(hMatch[1]) * 60)
    matched = true
  }

  // Match minutes
  const mMatch = trimmed.match(/(\d+)\s*m/i)
  if (mMatch) {
    totalMinutes += parseInt(mMatch[1], 10)
    matched = true
  }

  return matched ? totalMinutes : null
}
