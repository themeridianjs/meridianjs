import { addDays, getDay, getMonth, getDate } from "date-fns"
import type { WorkingDays, OrgHoliday } from "@/api/hooks/useOrgSettings"

// Map JS getDay() (0=Sun, 1=Mon, ..., 6=Sat) to WorkingDays keys
const DAY_KEY: (keyof WorkingDays)[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]

export function isBusinessDay(date: Date, workingDays: WorkingDays, holidays: OrgHoliday[]): boolean {
  const dayKey = DAY_KEY[getDay(date)]
  if (!workingDays[dayKey]) return false

  const month = getMonth(date)   // 0-indexed
  const day = getDate(date)      // 1-indexed

  for (const h of holidays) {
    const hDate = new Date(h.date)
    if (h.recurring) {
      if (getMonth(hDate) === month && getDate(hDate) === day) return false
    } else {
      if (
        hDate.getFullYear() === date.getFullYear() &&
        getMonth(hDate) === month &&
        getDate(hDate) === day
      ) {
        return false
      }
    }
  }

  return true
}

/**
 * Count working (business) days from start to end, both inclusive.
 */
export function countBusinessDays(
  start: Date,
  end: Date,
  workingDays: WorkingDays,
  holidays: OrgHoliday[]
): number {
  let count = 0
  let current = new Date(start)
  current.setHours(0, 0, 0, 0)
  const endNorm = new Date(end)
  endNorm.setHours(0, 0, 0, 0)

  while (current <= endNorm) {
    if (isBusinessDay(current, workingDays, holidays)) count++
    current = addDays(current, 1)
  }

  return count
}
