import { format, addDays, subDays } from "date-fns"
import type { Issue } from "@/api/hooks/useIssues"
import type { ProjectStatus } from "@/api/hooks/useProjectStatuses"
import type { Sprint } from "@/api/hooks/useSprints"
import type { WorkingDays, OrgHoliday } from "@/api/hooks/useOrgSettings"
import { countBusinessDays, isBusinessDay } from "@/lib/businessDays"

interface GanttExportOptions {
  project: { name: string; identifier: string; description?: string }
  issues: Issue[]
  statuses: ProjectStatus[]
  sprints: Sprint[]
  userMap: Map<string, { name: string; initials: string }>
  workingDays: WorkingDays
  holidays: OrgHoliday[]
}

const TABLE_COL_COUNT = 9 // A–I

function hexToArgb(hex: string): string {
  const clean = hex.replace("#", "")
  return "FF" + clean
}

export async function exportGanttToExcel(options: GanttExportOptions): Promise<void> {
  const ExcelJS = await import("exceljs")
  const { project, issues, statuses, sprints, userMap, workingDays, holidays } = options

  const statusMap = new Map(statuses.map((s) => [s.key, s]))

  // Group issues
  const scheduled = issues.filter((i) => i.due_date)
  const unscheduled = issues.filter((i) => !i.due_date)

  const sprintMap: Record<string, Issue[]> = {}
  const noSprintIssues: Issue[] = []
  for (const issue of scheduled) {
    if (issue.sprint_id) {
      if (!sprintMap[issue.sprint_id]) sprintMap[issue.sprint_id] = []
      sprintMap[issue.sprint_id].push(issue)
    } else {
      noSprintIssues.push(issue)
    }
  }

  // Compute date range for Gantt columns
  let minDate: Date | null = null
  let maxDate: Date | null = null
  for (const issue of scheduled) {
    const start = issue.start_date ? new Date(issue.start_date) : new Date(issue.due_date!)
    const end = new Date(issue.due_date!)
    if (!minDate || start < minDate) minDate = start
    if (!maxDate || end > maxDate) maxDate = end
  }

  const hasGantt = minDate !== null && maxDate !== null
  const ganttStart = hasGantt ? subDays(minDate!, 7) : null
  const ganttEnd = hasGantt ? addDays(maxDate!, 7) : null

  // Build day columns
  const dayCols: Date[] = []
  if (ganttStart && ganttEnd) {
    let d = new Date(ganttStart)
    while (d <= ganttEnd) {
      dayCols.push(new Date(d))
      d = addDays(d, 1)
    }
  }

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet("Gantt Chart")

  const totalCols = TABLE_COL_COUNT + dayCols.length
  const darkZincBg: Partial<import("exceljs").Fill> = { type: "pattern", pattern: "solid", fgColor: { argb: "FF27272a" } }
  const lightGrayBg: Partial<import("exceljs").Fill> = { type: "pattern", pattern: "solid", fgColor: { argb: "FFf5f5f5" } }
  const altRowBg: Partial<import("exceljs").Fill> = { type: "pattern", pattern: "solid", fgColor: { argb: "FFfafafa" } }
  const sprintGroupBg: Partial<import("exceljs").Fill> = { type: "pattern", pattern: "solid", fgColor: { argb: "FFe0e7ff" } }
  const thinBorder: Partial<import("exceljs").Border> = { style: "thin", color: { argb: "FFe4e4e7" } }
  const cellBorders: Partial<import("exceljs").Borders> = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder }

  // --- Row 1: Project header ---
  ws.mergeCells(1, 1, 1, Math.max(TABLE_COL_COUNT, totalCols))
  const headerCell = ws.getCell(1, 1)
  headerCell.value = `${project.identifier} — ${project.name}`
  headerCell.font = { bold: true, size: 14, color: { argb: "FFffffff" } }
  headerCell.fill = darkZincBg as import("exceljs").Fill
  headerCell.alignment = { vertical: "middle" }
  ws.getRow(1).height = 30

  // --- Row 2: Export date ---
  ws.mergeCells(2, 1, 2, Math.max(TABLE_COL_COUNT, totalCols))
  const dateCell = ws.getCell(2, 1)
  dateCell.value = `Exported on ${format(new Date(), "MMM d, yyyy")}`
  dateCell.font = { size: 10, color: { argb: "FF71717a" } }
  dateCell.fill = darkZincBg as import("exceljs").Fill
  dateCell.alignment = { vertical: "middle" }

  // --- Row 3: Description (optional) ---
  if (project.description) {
    ws.mergeCells(3, 1, 3, Math.max(TABLE_COL_COUNT, totalCols))
    const descCell = ws.getCell(3, 1)
    descCell.value = project.description
    descCell.font = { size: 10, italic: true, color: { argb: "FFa1a1aa" } }
    descCell.fill = darkZincBg as import("exceljs").Fill
    descCell.alignment = { vertical: "middle" }
  }

  // --- Row 4: spacer ---

  // --- Row 5: Table headers ---
  const HEADER_ROW = 5
  const headers = ["ID", "Title", "Status", "Priority", "Assignee(s)", "Sprint", "Start Date", "Due Date", "Duration"]
  const colWidths = [12, 35, 15, 10, 22, 18, 12, 12, 10]

  for (let i = 0; i < headers.length; i++) {
    const col = ws.getColumn(i + 1)
    col.width = colWidths[i]

    const cell = ws.getCell(HEADER_ROW, i + 1)
    cell.value = headers[i]
    cell.font = { bold: true, size: 10, color: { argb: "FFffffff" } }
    cell.fill = darkZincBg as import("exceljs").Fill
    cell.alignment = { horizontal: "center", vertical: "middle" }
    cell.border = cellBorders as import("exceljs").Borders
  }

  // Day column headers
  for (let i = 0; i < dayCols.length; i++) {
    const colIdx = TABLE_COL_COUNT + i + 1
    const col = ws.getColumn(colIdx)
    col.width = 4

    const cell = ws.getCell(HEADER_ROW, colIdx)
    cell.value = `${format(dayCols[i], "d")}\n${format(dayCols[i], "MMM")}`
    cell.font = { bold: true, size: 7, color: { argb: "FFffffff" } }
    cell.fill = darkZincBg as import("exceljs").Fill
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
    cell.border = cellBorders as import("exceljs").Borders
  }
  ws.getRow(HEADER_ROW).height = 28

  // --- Data rows ---
  let currentRow = HEADER_ROW + 1
  let dataRowIndex = 0

  function writeSprintGroupRow(name: string) {
    ws.mergeCells(currentRow, 1, currentRow, TABLE_COL_COUNT)
    const cell = ws.getCell(currentRow, 1)
    cell.value = name
    cell.font = { bold: true, size: 10, color: { argb: "FF312e81" } }
    cell.fill = sprintGroupBg as import("exceljs").Fill
    cell.alignment = { vertical: "middle" }
    cell.border = cellBorders as import("exceljs").Borders

    // Fill day columns with sprint group bg too
    for (let i = 0; i < dayCols.length; i++) {
      const dc = ws.getCell(currentRow, TABLE_COL_COUNT + i + 1)
      dc.fill = sprintGroupBg as import("exceljs").Fill
      dc.border = cellBorders as import("exceljs").Borders
    }

    currentRow++
  }

  function writeIssueRow(issue: Issue, sprintName: string) {
    const isEven = dataRowIndex % 2 === 0
    const status = statusMap.get(issue.status)
    const assigneeNames = issue.assignee_ids?.length
      ? issue.assignee_ids.map((id) => userMap.get(id)?.name ?? "Unknown").join(", ")
      : "Unassigned"

    const startDate = issue.start_date ? new Date(issue.start_date) : null
    const dueDate = issue.due_date ? new Date(issue.due_date) : null

    let duration = "—"
    if (startDate && dueDate && workingDays) {
      const biz = countBusinessDays(startDate, dueDate, workingDays, holidays)
      duration = `${biz}d`
    }

    const values = [
      issue.identifier,
      issue.title,
      status?.name ?? issue.status,
      issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1),
      assigneeNames,
      sprintName,
      startDate ? format(startDate, "MMM d, yyyy") : "—",
      dueDate ? format(dueDate, "MMM d, yyyy") : "—",
      duration,
    ]

    for (let i = 0; i < values.length; i++) {
      const cell = ws.getCell(currentRow, i + 1)
      cell.value = values[i]
      cell.font = { size: 9 }
      cell.alignment = { vertical: "middle" }
      cell.border = cellBorders as import("exceljs").Borders

      if (isEven) {
        cell.fill = altRowBg as import("exceljs").Fill
      }

      // Status column: colored fill
      if (i === 2 && status) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: hexToArgb(status.color) } } as import("exceljs").Fill
        cell.font = { size: 9, color: { argb: "FFffffff" }, bold: true }
        cell.alignment = { horizontal: "center", vertical: "middle" }
      }
    }

    // Gantt day cells — find bar range and merge into a single cell
    const issueStart = startDate ?? dueDate
    const issueEnd = dueDate
    let barStartCol = -1
    let barEndCol = -1

    if (issueStart && issueEnd) {
      for (let i = 0; i < dayCols.length; i++) {
        const day = dayCols[i]
        if (day >= issueStart && day <= issueEnd) {
          if (barStartCol === -1) barStartCol = TABLE_COL_COUNT + i + 1
          barEndCol = TABLE_COL_COUNT + i + 1
        }
      }
    }

    // Merge bar cells if the bar spans more than one column
    if (barStartCol !== -1 && barEndCol > barStartCol) {
      ws.mergeCells(currentRow, barStartCol, currentRow, barEndCol)
    }

    // Style the merged bar cell
    if (barStartCol !== -1 && status) {
      const barCell = ws.getCell(currentRow, barStartCol)
      barCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: hexToArgb(status.color) } } as import("exceljs").Fill
      barCell.border = cellBorders as import("exceljs").Borders
    }

    // Style non-bar day cells (weekends/holidays get gray, even rows get alt bg)
    for (let i = 0; i < dayCols.length; i++) {
      const colIdx = TABLE_COL_COUNT + i + 1
      // Skip columns that are part of the merged bar
      if (barStartCol !== -1 && colIdx >= barStartCol && colIdx <= barEndCol) continue

      const cell = ws.getCell(currentRow, colIdx)
      cell.border = cellBorders as import("exceljs").Borders

      const isBusiness = isBusinessDay(dayCols[i], workingDays, holidays)
      if (!isBusiness) {
        cell.fill = lightGrayBg as import("exceljs").Fill
      } else if (isEven) {
        cell.fill = altRowBg as import("exceljs").Fill
      }
    }

    currentRow++
    dataRowIndex++
  }

  // Write sprint groups
  const sprintById = new Map(sprints.map((s) => [s.id, s]))
  for (const sprint of sprints) {
    const sprintIssues = sprintMap[sprint.id]
    if (!sprintIssues?.length) continue

    writeSprintGroupRow(sprint.name)
    for (const issue of sprintIssues) {
      writeIssueRow(issue, sprint.name)
    }
  }

  // No sprint group
  if (noSprintIssues.length > 0) {
    writeSprintGroupRow("No Sprint")
    for (const issue of noSprintIssues) {
      writeIssueRow(issue, "—")
    }
  }

  // Unscheduled group (table only, no bars)
  if (unscheduled.length > 0) {
    writeSprintGroupRow("Unscheduled")
    for (const issue of unscheduled) {
      const sprintName = issue.sprint_id ? (sprintById.get(issue.sprint_id)?.name ?? "—") : "—"
      writeIssueRow(issue, sprintName)
    }
  }

  // Freeze panes: freeze at row 6 (after header row 5), column J (after 9 table cols)
  ws.views = [{ state: "frozen" as const, xSplit: TABLE_COL_COUNT, ySplit: HEADER_ROW }]

  // Generate and download
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${project.identifier}-gantt-${format(new Date(), "yyyy-MM-dd")}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
