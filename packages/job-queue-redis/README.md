# @meridianjs/job-queue-redis

Production-grade cron scheduler for MeridianJS, backed by [BullMQ](https://docs.bullmq.io/) + Redis. Jobs persist across restarts, run on a distributed schedule, and are retried automatically on failure.

For local development without Redis, use [`@meridianjs/job-queue-local`](../job-queue-local) instead.

## Installation

```bash
npm install @meridianjs/job-queue-redis
```

## Configuration

Register in `meridian.config.ts`:

```typescript
export default defineConfig({
  modules: [
    {
      resolve: "@meridianjs/job-queue-redis",
      options: { url: process.env.REDIS_URL },
    },
  ],
})
```

| Option | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | — | Redis connection URL (required) |
| `prefix` | `string` | `"meridian:job"` | Prefix for all BullMQ queue names |

## Writing Jobs

Jobs are identical in both the local and Redis implementations — no code changes needed when switching:

```typescript
// src/jobs/daily-summary.ts
import type { JobConfig } from "@meridianjs/types"

export default async function handler({ container }: { container: any }) {
  const logger = container.resolve("logger") as any
  logger.info("Sending daily summary emails")
  // ... your logic here
}

export const config: JobConfig = {
  name: "daily-summary",
  schedule: "0 8 * * *",  // every day at 8 AM
}
```

Each job gets its own named BullMQ queue (`meridian:job:<name>`). On restart, existing repeatable jobs are cleaned up and re-registered to prevent duplicates.

## Behaviour

- Each job runs with `concurrency: 1` — jobs of the same name run sequentially.
- Completed jobs are retained for the last 100 entries; failed jobs for 50.
- Worker and queue connections are gracefully closed on `SIGTERM` / `SIGINT`.

## Switching from Local

```typescript
// development
{ resolve: "@meridianjs/job-queue-local" }

// production
{ resolve: "@meridianjs/job-queue-redis", options: { url: process.env.REDIS_URL } }
```

## License

MIT
