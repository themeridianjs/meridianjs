# @meridianjs/event-bus-local

In-process event bus for MeridianJS, backed by Node.js `EventEmitter`. Designed for local development and single-process deployments.

For production multi-process deployments, use [`@meridianjs/event-bus-redis`](../event-bus-redis) instead.

## Installation

```bash
npm install @meridianjs/event-bus-local
```

## Configuration

Register in `meridian.config.ts`:

```typescript
export default defineConfig({
  modules: [
    { resolve: "@meridianjs/event-bus-local" },
  ],
})
```

No options required. The event bus is registered under the `eventBus` token and used automatically by all domain modules.

## Behaviour

- Events are dispatched via `setImmediate`, making emission non-blocking for the caller while preserving per-event ordering.
- Up to 500 listeners per event name (configurable internally).
- Errors thrown inside a subscriber are caught and logged — they do not crash the process or affect other subscribers.
- `unsubscribe()` removes **all** listeners for the event name (a limitation of anonymous wrapper functions). Use `@meridianjs/event-bus-redis` if you need fine-grained handler removal.

## Switching to Redis in Production

The event bus interface (`IEventBus`) is identical between the two implementations. Switching is a single line change:

```typescript
// development
{ resolve: "@meridianjs/event-bus-local" }

// production
{ resolve: "@meridianjs/event-bus-redis", options: { url: process.env.REDIS_URL } }
```

## Direct Usage

If you need to emit or subscribe programmatically:

```typescript
import type { IEventBus } from "@meridianjs/types"

const eventBus = container.resolve("eventBus") as IEventBus

// Emit
await eventBus.emit({ name: "issue.created", data: { issueId: "..." } })

// Subscribe
eventBus.subscribe("issue.created", async ({ event, container }) => {
  console.log("Issue created:", event.data)
})
```

## License

MIT
