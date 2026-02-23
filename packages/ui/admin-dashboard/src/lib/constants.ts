export const ISSUE_STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  cancelled: "Cancelled",
}

export const ISSUE_STATUS_COLORS: Record<string, string> = {
  backlog: "text-zinc-400",
  todo: "text-zinc-500",
  in_progress: "text-indigo-500",
  in_review: "text-amber-500",
  done: "text-emerald-500",
  cancelled: "text-zinc-400",
}

export const ISSUE_PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "None",
}

export const ISSUE_PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-500",
  high: "text-orange-500",
  medium: "text-yellow-500",
  low: "text-blue-400",
  none: "text-zinc-400",
}

export const ISSUE_TYPE_LABELS: Record<string, string> = {
  task: "Task",
  bug: "Bug",
  feature: "Feature",
  improvement: "Improvement",
  epic: "Epic",
}

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  archived: "Archived",
  paused: "Paused",
}

export const BOARD_COLUMNS = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "Todo" },
  { key: "in_progress", label: "In Progress" },
  { key: "in_review", label: "In Review" },
  { key: "done", label: "Done" },
] as const

export type BoardColumnKey = (typeof BOARD_COLUMNS)[number]["key"]
