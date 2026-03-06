---
id: build-a-widget
title: "Tutorial: Build a Widget — Project Budget Panel"
description: Extend the Meridian admin dashboard with a custom React widget that displays budget data from your module.
sidebar_position: 3
---

# Tutorial: Build a Widget — Project Budget Panel

This tutorial is a direct continuation of [Tutorial: Build a Module — Project Budget Tracker](./build-a-module). We will take the `ProjectBudget` module you built there and surface its data in the admin dashboard by adding a **Budget Panel widget** to the project board.

:::info Prerequisites
Complete the [Project Budget Tracker module tutorial](./build-a-module) first, or have an API endpoint available at `GET /admin/projects/:id/budget` that returns `{ budget: { total_amount, spent_amount, remaining, currency } }`.
:::

---

## What we're building

A widget that renders above the Kanban board for every project, showing a live budget summary pulled from the API:

```
┌────────────────────────────────────────────────┐
│  Budget                               USD       │
│  $6,200 spent of $20,000  ████████░░░░  31%    │
│  $13,800 remaining                              │
└────────────────────────────────────────────────┘
```

It lives in the `project.board.before` zone, which means it receives `{ projectId: string }` as props and appears at the top of every project's Kanban board.

---

## File structure

```
src/admin/widgets/
├── BudgetWidget.tsx       ← new widget component
└── index.tsx              ← widget registry (create if missing)
```

:::tip Dashboard required
Widgets only work when the admin dashboard is enabled. Make sure `@meridianjs/admin-dashboard` is in your dependencies and `dashboard: true` was selected during project setup.
:::

---

## Step 1 — Create the widget component

```typescript
// src/admin/widgets/BudgetWidget.tsx
import React from "react"

interface Budget {
  total_amount: number
  spent_amount: number
  remaining: number
  currency: string
}

interface Props {
  projectId: string
}

export function BudgetWidget({ projectId }: Props) {
  const [budget, setBudget] = React.useState<Budget | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const token = localStorage.getItem("meridian_token")
    fetch(`/admin/projects/${projectId}/budget`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("No budget configured for this project")
        return r.json()
      })
      .then((data) => setBudget(data.budget))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading) return null
  if (error) return null   // no budget set — render nothing, don't break the board

  const pct = budget!.total_amount > 0
    ? Math.round((budget!.spent_amount / budget!.total_amount) * 100)
    : 0

  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: budget!.currency }).format(n)

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "16px",
      padding: "10px 16px",
      marginBottom: "12px",
      borderRadius: "10px",
      border: "1px solid var(--border, #e4e4e7)",
      background: "var(--card, #ffffff)",
      fontSize: "13px",
      color: "var(--foreground, #18181b)",
    }}>
      {/* Label */}
      <span style={{ fontWeight: 600, marginRight: "4px" }}>Budget</span>

      {/* Progress bar */}
      <div style={{ flex: 1, background: "var(--muted, #f4f4f5)", borderRadius: "4px", height: "6px" }}>
        <div style={{
          width: `${Math.min(pct, 100)}%`,
          height: "100%",
          borderRadius: "4px",
          background: pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : "#6366f1",
          transition: "width 0.3s ease",
        }} />
      </div>

      {/* Numbers */}
      <span style={{ whiteSpace: "nowrap", color: "var(--muted-foreground, #71717a)" }}>
        {fmt(budget!.spent_amount)} <span style={{ opacity: 0.5 }}>of</span> {fmt(budget!.total_amount)}
      </span>
      <span style={{
        padding: "2px 8px",
        borderRadius: "9999px",
        fontSize: "11px",
        fontWeight: 600,
        background: pct > 90 ? "#fef2f2" : "#eff6ff",
        color: pct > 90 ? "#ef4444" : "#6366f1",
      }}>
        {pct}%
      </span>
      <span style={{ whiteSpace: "nowrap", color: "var(--muted-foreground, #71717a)" }}>
        {fmt(budget!.remaining)} remaining
      </span>
    </div>
  )
}
```

:::info Import React explicitly
Widget files must import React at the top of the file:

```typescript
import React from "react"
```

The build step replaces this import with `window.__React` — the same React instance already loaded by the dashboard — so there is no duplicate React instance and hooks work correctly.
:::

---

## Step 2 — Register the widget

Create `src/admin/widgets/index.tsx` (or add to it if it already exists):

```typescript
// src/admin/widgets/index.tsx
import { defineWidgets } from "@meridianjs/admin-dashboard/extensions"
import { BudgetWidget } from "./BudgetWidget"

export default defineWidgets([
  { zone: "project.board.before", component: BudgetWidget },
])
```

`project.board.before` renders above the Kanban columns on every project board page. The dashboard automatically passes `{ projectId }` to your component — no wiring needed.

---

## Step 3 — Run the dashboard

```bash
npm run dev
```

This starts the API server, compiles your widget via esbuild, and launches the dashboard. Open a project board — the budget panel appears at the top if a budget has been set for that project.

To iterate on widget UI without restarting the API:

```bash
# terminal 1 — API server only
npm run dev

# terminal 2 — dashboard + widget hot-reload
npx meridian serve-dashboard
```

---

## Step 4 — Seed a budget to test

If you have not set a budget for a project yet, call the endpoint you built in the module tutorial:

```bash
curl -X POST http://localhost:9000/admin/projects/<project-id>/budget/setup \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{ "total_amount": 20000, "currency": "USD" }'
```

Reload the project board — the budget panel should now appear.

---

## Extending the widget

Some ideas to take it further:

| Idea | How |
|---|---|
| Edit budget inline | Add an input + `PATCH` call on blur |
| Log an expense from the board | Add a "Record expense" button calling `POST /admin/projects/:id/budget` |
| Show on sprints page | Register with zone `project.sprints.before` — same props, no changes needed |
| Warn when over budget | Change the bar to red and add a warning label when `pct >= 100` |

To show the same widget on the sprints page in addition to the board:

```typescript
export default defineWidgets([
  { zone: "project.board.before",   component: BudgetWidget },
  { zone: "project.sprints.before", component: BudgetWidget },
])
```

Both zones receive `{ projectId }`, so the same component works in both without any changes.

---

## What you built

- A live, API-backed widget injected into the project board
- Zero modifications to the dashboard source — all changes live in your project under `src/admin/widgets/`
- A reusable pattern for surfacing any custom module data in the UI

---

## Full tutorial series

| Tutorial | What you learn |
|---|---|
| [Build a Module →](./build-a-module) | Persist data, write a service, expose API routes |
| **Build a Widget** *(this page)* | Display module data in the admin dashboard |
| [Build a Plugin →](./build-a-plugin) | Add cron jobs, event subscribers, and new routes as a plugin |
