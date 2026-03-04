---
id: widgets
title: Dashboard Widgets
description: Widget zones, widget file format, and available props.
sidebar_position: 2
---

# Dashboard Widgets

The admin dashboard supports extension via **widget zones** — named slots in the UI where you can inject custom React components. Drop a file in `src/admin/widgets/` and it auto-registers.

:::note Coming in Phase 12
Widget zones are planned for Phase 12. The structure below describes the intended API.
:::

---

## Widget File Format

Each widget file exports a default React component and a `config` object that declares which zone(s) it targets:

```typescript
// src/admin/widgets/issue-ai-assist.tsx
import type { WidgetConfig, IssueDetailWidgetProps } from '@meridianjs/admin-dashboard'

export const config: WidgetConfig = {
  zone: 'issue.details.sidebar',
}

export default function IssueAiAssistWidget({ issue }: IssueDetailWidgetProps) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-semibold mb-2">AI Assist</h3>
      <p className="text-xs text-muted-foreground">{issue.description}</p>
    </div>
  )
}
```

---

## Available Widget Zones

| Zone | Page | Props |
|---|---|---|
| `issue.details.sidebar` | Issue Detail | `IssueDetailWidgetProps` |
| `issue.details.after_description` | Issue Detail | `IssueDetailWidgetProps` |
| `project.overview.header` | Project Detail | `ProjectWidgetProps` |
| `project.kanban.column_header` | Kanban Board | `KanbanColumnWidgetProps` |
| `dashboard.metrics` | Dashboard | `DashboardWidgetProps` |
| `settings.workspace.general.after` | Workspace Settings | `WorkspaceWidgetProps` |

---

## Prop Types

```typescript
interface IssueDetailWidgetProps {
  issue: Issue
  project: Project
}

interface ProjectWidgetProps {
  project: Project
}

interface KanbanColumnWidgetProps {
  status: ProjectStatus
  project: Project
  issues: Issue[]
}

interface DashboardWidgetProps {
  workspace: Workspace
}

interface WorkspaceWidgetProps {
  workspace: Workspace
}
```

---

## Example: Custom Metrics Widget

```typescript
// src/admin/widgets/sprint-velocity.tsx
import { useQuery } from '@tanstack/react-query'
import type { WidgetConfig, ProjectWidgetProps } from '@meridianjs/admin-dashboard'

export const config: WidgetConfig = {
  zone: 'project.overview.header',
}

export default function SprintVelocityWidget({ project }: ProjectWidgetProps) {
  const { data } = useQuery({
    queryKey: ['sprint-velocity', project.id],
    queryFn: () => fetch(`/admin/projects/${project.id}/velocity`).then(r => r.json()),
  })

  if (!data) return null

  return (
    <div className="flex items-center gap-2 rounded border px-3 py-2">
      <span className="text-sm font-medium">Velocity</span>
      <span className="text-lg font-bold text-indigo-500">{data.avg_points}/sprint</span>
    </div>
  )
}
```
