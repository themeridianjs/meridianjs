# @meridianjs/event-bus-redis

Production-grade event bus for MeridianJS, backed by [BullMQ](https://docs.bullmq.io/) + Redis. Provides durable, at-least-once, async event delivery across multiple processes or servers.

For local development without Redis, use [`@meridianjs/event-bus-local`](../event-bus-local) instead.

## Installation

```bash
npm install @meridianjs/event-bus-redis
```

## Configuration

Register in `meridian.config.ts`:

```typescript
export default defineConfig({
  modules: [
    {
      resolve: "@meridianjs/event-bus-redis",
      options: { url: process.env.REDIS_URL },
    },
  ],
})
```

| Option | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | — | Redis connection URL (required) |
| `queueName` | `string` | `"meridian:events"` | BullMQ queue name |
| `concurrency` | `number` | `5` | Worker concurrency |

## Behaviour

- All events are published to a single persistent BullMQ queue.
- A worker processes jobs and fans out to all in-process subscribers for the event name.
- Failed jobs are retried up to 3 times with exponential back-off (1 s base).
- Completed jobs are retained for the last 1 000 entries; failed jobs for 500.
- The queue, worker, and Redis connection are all gracefully closed when the application stops.

## Switching from Local

The event bus interface is the same across both implementations:

```typescript
// development
{ resolve: "@meridianjs/event-bus-local" }

// production
{ resolve: "@meridianjs/event-bus-redis", options: { url: process.env.REDIS_URL } }
```

## Direct Usage

```typescript
import type { IEventBus } from "@meridianjs/types"

const eventBus = container.resolve("eventBus") as IEventBus

await eventBus.emit([
  { name: "issue.created",       data: { issueId: "..." } },
  { name: "activity.recorded",   data: { actorId: "..." } },
])
```

## License

MIT
