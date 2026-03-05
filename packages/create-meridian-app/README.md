# create-meridian-app

CLI for creating and managing MeridianJS projects. Scaffold a new project interactively, or manage an existing one with sub-commands for dev, production start, builds, database migrations, code generation, and the admin dashboard.

## Create a New Project

```bash
npx create-meridian-app
# or
npx create-meridian-app my-app
```

The interactive wizard prompts for:
- Project name
- Database URL
- HTTP port (default: `9000`)
- Whether to include the admin dashboard
- Optional modules (Google OAuth, SendGrid, Resend, SES, S3)
- Whether to seed demo data

## CLI Commands

Once a project is created, the `meridian` CLI is available locally in the project:

### Development

```bash
npm run dev
# or
meridian dev
```

Starts the API server with `NODE_ENV=development` and, if `@meridianjs/admin-dashboard` is installed, starts the dashboard server. Loads `.env` automatically.

### Production

```bash
npm start
# or
meridian start
```

Starts the API server with `NODE_ENV=production`. Same process as `dev` but without development-only behaviour (schema auto-sync is disabled via `autoSyncSchema: false` in config).

### Build

```bash
npm run build
# or
meridian build
```

Runs `tsc --noEmit` to type-check the project.

### Database

```bash
# Sync schema (adds missing tables/columns, never drops)
npm run db:migrate
meridian db:migrate

# Generate a migration file
npm run db:generate add-due-date
meridian db:generate add-due-date
```

### Code Generation

Scaffold boilerplate files for common patterns:

```bash
meridian generate module   <name>       # New module in src/modules/
meridian generate workflow <name>       # New workflow in src/workflows/
meridian generate subscriber <event>   # New subscriber in src/subscribers/
meridian generate job      <name>       # New scheduled job in src/jobs/
meridian generate route    <path>       # New API route file
meridian generate plugin   <name>       # New local plugin in src/plugins/

# Alias
meridian g module my-feature
```

### Admin Dashboard

```bash
# Serve the dashboard standalone (separate from API)
meridian serve-dashboard
meridian serve-dashboard --port 3000
```

### User Management

```bash
meridian user:create --email admin@example.com --role super-admin
```

## Scaffolded Project Structure

```
my-app/
├── src/
│   ├── main.ts                  Entry point
│   ├── api/
│   │   ├── middlewares.ts       Route-level middleware config
│   │   └── admin/               File-based API routes
│   ├── modules/                 Custom domain modules
│   ├── workflows/               DAG workflows with compensation
│   ├── subscribers/             Event subscribers
│   ├── jobs/                    Scheduled background jobs
│   ├── links/                   Cross-module link definitions
│   └── admin/
│       └── widgets/
│           └── index.tsx        Dashboard widget extensions
├── meridian.config.ts           Framework configuration
├── .env                         Environment variables
├── .env.example                 Environment variable template
├── package.json
└── tsconfig.json
```

## Project `package.json` Scripts

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `meridian dev` | Development server |
| `npm start` | `meridian start` | Production server |
| `npm run build` | `meridian build` | Type-check |
| `npm run db:migrate` | `meridian db:migrate` | Sync database schema |
| `npm run db:generate` | `meridian db:generate` | Generate migration |
| `npm run seed:demo` | (if opted in) | Seed demo data |

## License

MIT
