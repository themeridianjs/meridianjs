export interface TimeLogUserGroup {
  user_id: string
  total_minutes: number
}

export interface TimeLogProjectGroup {
  /** null = time logged without a project ("No project" bucket). */
  project_id: string | null
  total_minutes: number
}

export interface TimeLogAggregates {
  totalMinutes: number
  employeeCount: number
  /** Distinct NON-null project ids — the null bucket is excluded here but kept in byProject. */
  projectCount: number
  /** Sorted by total_minutes desc. */
  byUser: TimeLogUserGroup[]
  /** Sorted by total_minutes desc; includes a project_id: null bucket when present. */
  byProject: TimeLogProjectGroup[]
}

/**
 * Aggregate a full set of time logs for reporting. Pure — no DB access.
 * Running timers (duration_minutes: null) contribute 0 minutes but still
 * count toward the employee set, matching the paginated table which shows
 * them as "Running…".
 */
export function aggregateTimeLogs(
  logs: Array<{ user_id: string; project_id?: string | null; duration_minutes?: number | null }>
): TimeLogAggregates {
  let totalMinutes = 0
  const byUserMap = new Map<string, number>()
  const byProjectMap = new Map<string | null, number>()

  for (const l of logs) {
    const minutes = l.duration_minutes ?? 0
    totalMinutes += minutes
    byUserMap.set(l.user_id, (byUserMap.get(l.user_id) ?? 0) + minutes)
    const projectKey = l.project_id ?? null
    byProjectMap.set(projectKey, (byProjectMap.get(projectKey) ?? 0) + minutes)
  }

  const byUser = [...byUserMap.entries()]
    .map(([user_id, total_minutes]) => ({ user_id, total_minutes }))
    .sort((a, b) => b.total_minutes - a.total_minutes)
  const byProject = [...byProjectMap.entries()]
    .map(([project_id, total_minutes]) => ({ project_id, total_minutes }))
    .sort((a, b) => b.total_minutes - a.total_minutes)

  return {
    totalMinutes,
    employeeCount: byUserMap.size,
    projectCount: byProject.filter((g) => g.project_id !== null).length,
    byUser,
    byProject,
  }
}
