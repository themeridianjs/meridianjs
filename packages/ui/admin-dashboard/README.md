# @meridianjs/admin-dashboard

The MeridianJS admin dashboard. A Linear.app-inspired React SPA built with Vite, TanStack Query, Tailwind CSS, and shadcn/ui. Served as a static site alongside your API.

## Running in Development

The dashboard is automatically started when you run `meridian dev` from a scaffolded project that includes it. It starts on port `5174` (configurable) and proxies API calls to port `9000`.

To run the dashboard standalone:

```bash
cd node_modules/@meridianjs/admin-dashboard
npm run dev
```

Or via the CLI:

```bash
meridian serve-dashboard
meridian serve-dashboard --port 3000
```

## Tech Stack

| Concern | Library |
|---|---|
| Framework | React 18 |
| Build | Vite 5 |
| Routing | React Router v6 |
| Data fetching | TanStack Query v5 |
| Styling | Tailwind CSS + shadcn/ui |
| Drag & drop | @dnd-kit |
| Notifications | Sonner |
| Icons | Lucide React |
| Theming | next-themes (light / dark) |

## Features

- **Kanban board** — custom project statuses as columns, drag-and-drop issue reorder, column reorder, hex-tinted column backgrounds
- **Issue list** — filterable by status, priority, type, assignee, sprint
- **Issue detail** — inline edit, full-page view, sub-issues, comments, attachments, time tracking
- **Sprint management** — create, start, complete sprints; move issues between sprints
- **Project timeline** — Gantt chart with business-day calculations from `@meridianjs/org-calendar`
- **Workspace settings** — member management (invite, role change, remove), team management with inline member lists
- **Project access** — per-project member and team grants via `ProjectAccessDialog`
- **Notifications bell** — real-time count, mark as read
- **Custom RBAC roles** — create roles with permission strings, assign to users
- **Org settings** — working-day schedule, public holiday management

## Widget / Extension System

Inject custom React components into named zones in the dashboard UI without modifying the core package.

### Defining Widgets

Create `src/admin/widgets/index.tsx` in your project:

```tsx
import React from "react"

function MyBanner({ projectId }: { projectId: string }) {
  return (
    <div className="mx-6 my-2 p-3 rounded border border-border text-sm text-muted-foreground">
      Custom panel for project: {projectId}
    </div>
  )
}

export default [
  { zone: "project.board.before", component: MyBanner },
]
```

Widgets are compiled at startup by `meridian dev` / `meridian serve-dashboard` via esbuild and loaded by the dashboard at runtime. React is shared via `window.__React` to prevent duplicate instances.

### Available Zones

| Zone | Page | Props |
|---|---|---|
| `issue.details.before` | Issue detail | `{ issue }` |
| `issue.details.after` | Issue detail | `{ issue }` |
| `issue.details.sidebar` | Issue detail page | `{ issue }` |
| `project.board.before` | Kanban board | `{ projectId }` |
| `project.board.after` | Kanban board | `{ projectId }` |
| `project.issues.before` | Issue list | `{ projectId }` |
| `project.issues.after` | Issue list | `{ projectId }` |
| `project.timeline.before` | Gantt chart | `{ projectId }` |
| `project.timeline.after` | Gantt chart | `{ projectId }` |
| `project.sprints.before` | Sprints page | `{ projectId }` |
| `project.sprints.after` | Sprints page | `{ projectId }` |
| `workspace.settings.before` | Workspace settings | `{ workspaceId }` |
| `workspace.settings.after` | Workspace settings | `{ workspaceId }` |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `API_URL` | `http://localhost:9000` | API base URL — **must be set in production** |
| `DASHBOARD_PORT` | `5174` | Port the dashboard serves on |

## License

MIT
