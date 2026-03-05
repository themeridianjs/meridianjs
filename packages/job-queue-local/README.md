# @meridianjs/job-queue-local

In-process cron scheduler for MeridianJS, backed by [`node-cron`](https://github.com/node-cron/node-cron). Designed for local development and testing.

Jobs are registered in-memory and lost on process restart. For production use, replace this with [`@meridianjs/job-queue-redis`](../job-queue-redis).

## Installation

```bash
npm install @meridianjs/job-queue-local
```

## Configuration

Register in `meridian.config.ts`:

```typescript
export default defineConfig({
  modules: [
    { resolve: "@meridianjs/job-queue-local" },
  ],
})
```

No options required.

## Writing Jobs

Place job files under `src/jobs/`. Each file exports a default handler and a `config` object:

```typescript
// src/jobs/send-reminders.ts
import type { JobConfig } from "@meridianjs/types"

export default async function handler({ container }: { container: any }) {
  const logger = container.resolve("logger") as any
  logger.info("Running reminder job")
  // ... your logic here
}

export const config: JobConfig = {
  name: "send-reminders",
  schedule: "0 9 * * *",  // every day at 9 AM (cron expression)
}
```

Interval-based scheduling is also supported:

```typescript
export const config: JobConfig = {
  name: "cleanup",
  schedule: { interval: 60_000 },  // every 60 seconds
}
```

The framework auto-loads all files in `src/jobs/` at startup.

## Switching to Redis in Production

```typescript
// development
{ resolve: "@meridianjs/job-queue-local" }

// production
{ resolve: "@meridianjs/job-queue-redis", options: { url: process.env.REDIS_URL } }
```

## License

MIT
