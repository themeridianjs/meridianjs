---
id: create-subscribers
title: How to Create Subscribers
description: Create and register event subscribers in MeridianJS.
sidebar_position: 5
---

# How to Create Subscribers

Create a subscriber for an event:

```bash
npm run generate -- subscriber issue.created
# or: npx meridian generate subscriber issue.created
```

This generates:

```text
src/subscribers/issue-created.ts
```

Subscriber contract:

- Default export: async handler function
- Named export: `config` with `event` (string or string array)

Example — single event:

```ts
import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"

export default async function handler({ event, container }: SubscriberArgs) {
  const logger = container.resolve("logger") as any
  logger.info(`Received ${event.name}`, event.data)
}

export const config: SubscriberConfig = {
  event: "issue.created",
}
```

Example — multiple events with one handler:

```ts
import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"

export default async function handler({ event, container }: SubscriberArgs) {
  const logger = container.resolve("logger") as any
  logger.info(`Received ${event.name}`, event.data)

  // Differentiate by event name if needed
  if (event.name === "issue.created") {
    // ...
  } else if (event.name === "issue.assigned") {
    // ...
  }
}

export const config: SubscriberConfig = {
  event: ["issue.created", "issue.assigned"],
}
```

Subscribers are auto-loaded from `src/subscribers/` at bootstrap.

---

## Overriding Built-in System Events

`@meridianjs/meridian` ships subscribers for all core domain events (issue creation, assignment, comments, invitations, etc.). To replace one with your own logic, disable the built-in handler in `meridian.config.ts` and create a subscriber with the same event name in your own `src/subscribers/`:

```typescript
// meridian.config.ts
plugins: [
  {
    resolve: '@meridianjs/meridian',
    disableSubscribers: ['issue.assigned'], // suppress the built-in handler
  },
],
```

Your `src/subscribers/issue-assigned.ts` will then be the sole handler for that event.

See the full list of disableable events and a complete example in the [Plugin System → Disabling Built-in Subscribers](/docs/plugins/overview#disabling-built-in-subscribers) guide.
