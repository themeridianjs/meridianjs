import type { MeridianContainer, ScheduledJobConfig } from "@meridianjs/types"

/**
 * Daily cron job that creates one new issue instance for each recurring template
 * whose next_occurrence_date is due today. After creating the instance, advances
 * next_occurrence_date by one period (weekly = +7 days, monthly = +1 month).
 */
export default async function fn(container: MeridianContainer): Promise<void> {
  const logger = container.resolve("logger") as any
  const svc = container.resolve("issueModuleService") as any

  logger.info("[job:create-recurring-issues] Checking for due recurring issues")

  const dueIssues = await svc.listDueRecurringIssues()

  if ((dueIssues as any[]).length === 0) {
    logger.info("[job:create-recurring-issues] No recurring issues due today")
    return
  }

  let created = 0

  for (const template of dueIssues as any[]) {
    const occurrenceDate = new Date(template.next_occurrence_date)

    // Skip if past the end date
    if (template.recurrence_end_date && occurrenceDate > new Date(template.recurrence_end_date)) {
      logger.info(`[job:create-recurring-issues] Skipping ${template.identifier} — past end date`)
      continue
    }

    const freq = template.recurrence_frequency as "weekly" | "monthly"
    const freqLabel = freq === "weekly" ? "Weekly" : "Monthly"

    const durationMs =
      template.due_date && template.start_date
        ? new Date(template.due_date).getTime() - new Date(template.start_date).getTime()
        : null

    try {
      await svc.createIssueInProject({
        title: `${template.title} [${template.identifier}-${freqLabel}]`,
        project_id: template.project_id,
        workspace_id: template.workspace_id,
        type: template.type,
        priority: template.priority,
        status: template.status,
        assignee_ids: template.assignee_ids ?? null,
        reporter_id: template.reporter_id ?? null,
        sprint_id: null,
        task_list_id: template.task_list_id ?? null,
        start_date: occurrenceDate,
        due_date: durationMs !== null ? new Date(occurrenceDate.getTime() + durationMs) : undefined,
        recurrence_source_id: template.id,
      })

      // Advance next_occurrence_date by one period
      const next = new Date(occurrenceDate)
      if (freq === "weekly") {
        next.setDate(next.getDate() + 7)
      } else {
        next.setMonth(next.getMonth() + 1)
      }

      await svc.updateIssue(template.id, { next_occurrence_date: next })
      created++
      logger.info(`[job:create-recurring-issues] Created instance for ${template.identifier}, next at ${next.toISOString()}`)
    } catch (err: any) {
      logger.error(`[job:create-recurring-issues] Failed to create instance for ${template.identifier}: ${err?.message}`)
    }
  }

  logger.info(`[job:create-recurring-issues] Done — created ${created} instance(s)`)
}

export const config: ScheduledJobConfig = {
  name: "create-recurring-issues",
  schedule: "0 0 * * *", // daily at midnight UTC
}
