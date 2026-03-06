---
id: cli-getting-started
title: Meridian CLI Setup and Basics
description: Install, configure, and run the MeridianJS CLI.
sidebar_position: 3
---

# Meridian CLI Setup and Basics

## Create a new project

```bash
npx create-meridian-app@latest my-meridian-app
cd my-meridian-app
```

The scaffolded project includes a `meridian.config.ts`, core Meridian modules (via `@meridianjs/meridian` plugin), and CLI scripts.

## Setup steps

```bash
# 1) install dependencies (if you skipped install during scaffold)
npm install

# 2) configure environment
cp .env.example .env

# 3) create your PostgreSQL database (if it does not already exist)
createdb meridian_dev

# 4) update DATABASE_URL, JWT_SECRET, and other values in .env

# 5) synchronize database schema
npm run db:migrate

# 6) start development server
npm run dev
```

## Basic CLI commands

The `meridian` binary is installed locally in your project's `node_modules/.bin/`. Always run it via `npx` or through the npm scripts in `package.json`.

| Command | Description |
|---|---|
| `npx meridian new [project-name]` | Scaffold a new Meridian project |
| `npm run dev` | Start API server in development mode (and dashboard if installed) |
| `npm run start` | Start API server in **production** mode (`NODE_ENV=production`) |
| `npm run build` | Type-check the project (`tsc --noEmit`) |
| `npm run db:migrate` | Bootstraps app and syncs module schemas |
| `npm run db:generate <name>` | Create a timestamped migration placeholder in `src/migrations/` |
| `npx meridian serve-dashboard` | Serve admin dashboard as a static app (default port: `5174`) |
| `npx meridian serve-dashboard --port 3000` | Serve admin dashboard on a custom port |
| `npx meridian user:create --email <email> --role <role>` | Create a user (`super-admin`, `admin`, `moderator`, `member`) |
| `npm run generate -- module <name>` | Scaffold a module in `src/modules/` |
| `npm run generate -- subscriber <event>` | Scaffold an event subscriber in `src/subscribers/` |
| `npm run generate -- workflow <name>` | Scaffold a workflow in `src/workflows/` |
| `npm run generate -- job <name> --schedule "0 * * * *"` | Scaffold a scheduled job in `src/jobs/` |
| `npm run generate -- plugin <name>` | Scaffold a local plugin in `src/plugins/` |
| `npm run generate -- route <path> --methods GET,POST` | Scaffold a file-based API route in `src/api/` |

:::tip
`npm run generate -- <args>` is equivalent to `npx meridian generate <args>`. Both work — use whichever you prefer. All `generate` sub-commands can also be shortened to `g` (e.g. `npx meridian g module client`).
:::

## Command examples

```bash
# Start local development
npm run dev

# Generate a new migration placeholder
npm run db:generate add_issue_due_date_index

# Scaffold a module
npm run generate -- module time-log

# Scaffold a REST route
npm run generate -- route admin/reports/velocity --methods GET

# Serve the admin dashboard standalone
npx meridian serve-dashboard
```
