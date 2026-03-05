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

Run directly as `npx meridian <command>` or through npm scripts where available.

| Command | Description |
|---|---|
| `meridian new [project-name]` | Scaffold a new Meridian project |
| `meridian dev` | Start API server in development mode (and dashboard if installed) |
| `meridian start` | Start API server in **production** mode (`NODE_ENV=production`) |
| `meridian build` | Type-check the project (`tsc --noEmit`) |
| `meridian db:migrate` | Bootstraps app and syncs module schemas |
| `meridian db:generate <name>` | Create a timestamped migration placeholder in `src/migrations/` |
| `meridian serve-dashboard` | Serve admin dashboard as a static app (default port: `5174`) |
| `meridian serve-dashboard --port 3000` | Serve admin dashboard on a custom port |
| `meridian user:create --email <email> --role <role>` | Create a user (`super-admin`, `admin`, `moderator`, `member`) |
| `meridian generate module <name>` | Scaffold a module in `src/modules/` (alias: `meridian g module`) |
| `meridian generate subscriber <event>` | Scaffold an event subscriber in `src/subscribers/` |
| `meridian generate workflow <name>` | Scaffold a workflow in `src/workflows/` |
| `meridian generate job <name> --schedule "0 * * * *"` | Scaffold a scheduled job in `src/jobs/` |
| `meridian generate plugin <name>` | Scaffold a local plugin in `src/plugins/` |
| `meridian generate route <path> --methods GET,POST` | Scaffold a file-based API route in `src/api/` |

`meridian generate` can be shortened to `meridian g` for all sub-commands.

## Command examples

```bash
# Start local development
meridian dev

# Generate a new migration placeholder
meridian db:generate add_issue_due_date_index

# Scaffold a REST route
meridian generate route admin/reports/velocity --methods GET
```
