import { model } from "@meridianjs/framework-utils"

const TimeLog = model.define("time_log", {
  id: model.id().primaryKey(),
  issue_id: model.text(),
  user_id: model.text(),
  workspace_id: model.text(),
  /** Total duration in minutes. null when a timer is still running. */
  duration_minutes: model.number().nullable(),
  description: model.text().nullable(),
  /** The calendar date for this time entry (manual entries) */
  logged_date: model.date().nullable(),
  /** Set when the timer starts; null for manual entries */
  started_at: model.date().nullable(),
  /** Set when the timer stops; null while timer is running */
  stopped_at: model.date().nullable(),
  source: model.enum(["manual", "timer"]).default("manual"),
}, [
  { columns: ["issue_id"] },
  { columns: ["user_id"] },
])

export default TimeLog
