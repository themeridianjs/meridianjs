import { describe, it, expect } from "vitest"
import { aggregateTimeLogs } from "./reporting.js"

describe("aggregateTimeLogs", () => {
  it("returns zeroed aggregates for empty input", () => {
    const r = aggregateTimeLogs([])
    expect(r.totalMinutes).toBe(0)
    expect(r.employeeCount).toBe(0)
    expect(r.projectCount).toBe(0)
    expect(r.byUser).toEqual([])
    expect(r.byProject).toEqual([])
  })

  it("sums minutes per user and project, sorted desc", () => {
    const r = aggregateTimeLogs([
      { user_id: "u1", project_id: "p1", duration_minutes: 30 },
      { user_id: "u2", project_id: "p1", duration_minutes: 90 },
      { user_id: "u1", project_id: "p2", duration_minutes: 45 },
    ])
    expect(r.totalMinutes).toBe(165)
    expect(r.employeeCount).toBe(2)
    expect(r.projectCount).toBe(2)
    expect(r.byUser).toEqual([
      { user_id: "u2", total_minutes: 90 },
      { user_id: "u1", total_minutes: 75 },
    ])
    expect(r.byProject).toEqual([
      { project_id: "p1", total_minutes: 120 },
      { project_id: "p2", total_minutes: 45 },
    ])
  })

  it("treats running timers (null duration) as 0 but counts the employee", () => {
    const r = aggregateTimeLogs([
      { user_id: "u1", project_id: "p1", duration_minutes: null },
      { user_id: "u2", project_id: "p1", duration_minutes: 60 },
    ])
    expect(r.totalMinutes).toBe(60)
    expect(r.employeeCount).toBe(2)
    expect(r.byUser).toEqual([
      { user_id: "u2", total_minutes: 60 },
      { user_id: "u1", total_minutes: 0 },
    ])
  })

  it("buckets null project_id separately and excludes it from projectCount", () => {
    const r = aggregateTimeLogs([
      { user_id: "u1", project_id: null, duration_minutes: 20 },
      { user_id: "u1", project_id: undefined, duration_minutes: 10 },
      { user_id: "u1", project_id: "p1", duration_minutes: 5 },
    ])
    expect(r.projectCount).toBe(1)
    expect(r.byProject).toEqual([
      { project_id: null, total_minutes: 30 },
      { project_id: "p1", total_minutes: 5 },
    ])
    // invariant: byProject minutes sum to totalMinutes
    expect(r.byProject.reduce((s, g) => s + g.total_minutes, 0)).toBe(r.totalMinutes)
  })
})
