---
id: overview
title: Admin Dashboard
description: Overview, how to run, Vite proxy, and available pages.
sidebar_position: 1
---

# Admin Dashboard

The `@meridianjs/admin-dashboard` package is a Vite + React 18 single-page application that ships with every MeridianJS project. It provides a Linear.app-inspired UI for managing projects, issues, sprints, and workspace settings.

---

## Running the Dashboard

```bash
cd packages/ui/admin-dashboard
npm run dev
```

The dashboard starts on **port 9001** and proxies all API calls to **port 9000** (the MeridianJS server). Run both concurrently:

```bash
# Terminal 1 — API server
node --import tsx/esm apps/test-app/src/main.ts

# Terminal 2 — Dashboard
cd packages/ui/admin-dashboard && npm run dev
```

---

## Tech Stack

| Library | Version | Purpose |
|---|---|---|
| React | 18 | UI |
| Vite | 5 | Build + dev server |
| TanStack Query | 5 | Server state management |
| React Router | 6 | Client-side routing |
| Tailwind CSS | 3 | Utility-first styling |
| shadcn/ui | latest | Accessible component primitives |
| dnd-kit | latest | Drag-and-drop (Kanban, status reorder) |
| Lucide | latest | Icons |
| sonner | latest | Toast notifications |
| next-themes | latest | Dark/light mode toggle |

---

## Available Pages

| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Summary metrics and recent activity |
| `/projects` | Projects | List all projects with access controls |
| `/projects/:id` | Project Detail | Kanban board with custom status columns |
| `/projects/:id/issues` | Issue List | Filterable issue table |
| `/projects/:id/sprints` | Sprints | Sprint list and management |
| `/projects/:id/timeline` | Timeline | Gantt-style project timeline |
| `/issues/:id` | Issue Detail | Full issue view with comments |
| `/settings` | Workspace Settings | Members, Teams, General tabs |
| `/org/settings` | Org Settings | Org calendar and holidays |
| `/roles` | Roles | AppRole management (create/edit custom roles) |

---

## Design System

The dashboard uses a monochromatic zinc color palette with a single **indigo** accent (`#6366f1`). Typography uses **DM Sans** from Google Fonts.

Colors are defined in `tailwind.config.ts` using CSS custom properties. Dark mode is implemented via `next-themes` and a `dark` class on `<html>`.

---

## Custom Branding

You can replace the default "Meridian" name and concentric-circle logo on the login, register, and invite pages by adding `appName` and `logoUrl` to the `admin` section of your `meridian.config.ts`:

```typescript
import { defineConfig } from "@meridianjs/framework"

export default defineConfig({
  // ...
  admin: {
    appName: "My PM Tool",
    logoUrl: "/uploads/logo.png",
  },
})
```

| Option | Type | Default | Description |
|---|---|---|---|
| `appName` | `string` | `"Meridian"` | Displayed in headings like "Welcome to **My PM Tool**" |
| `logoUrl` | `string` | *(built-in SVG)* | URL for a logo image. Can be a relative path (e.g. `/uploads/logo.png`) or a full URL (e.g. `https://cdn.example.com/logo.png`) |

The branding is injected into the HTML at serve time via `window.__MERIDIAN_CONFIG__`, so it appears instantly on auth pages without an API call.

When running the dashboard via Vite dev server directly (during dashboard development), you can set the branding via environment variables instead:

```bash
VITE_APP_NAME="My PM Tool" VITE_LOGO_URL="/uploads/logo.png" npm run dev
```

---

## Building for Production

```bash
cd packages/ui/admin-dashboard
npm run build
```

The output goes to `packages/ui/admin-dashboard/dist/`. To serve it as part of your MeridianJS app, use the `@meridianjs/admin-dashboard` plugin (Phase 12 — coming soon), or serve `dist/` with any static file host.

---

## Proxying API Calls

The Vite dev config (`vite.config.ts`) proxies requests:

```typescript
server: {
  port: 9001,
  proxy: {
    '/admin': 'http://localhost:9000',
    '/auth':  'http://localhost:9000',
  }
}
```

In production, configure your reverse proxy (nginx, Caddy, etc.) to route `/admin` and `/auth` to the Node.js process.
