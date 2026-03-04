---
id: create-subscribers
title: How to Create Subscribers
description: Create and register event subscribers in MeridianJS.
sidebar_position: 5
---

# How to Create Subscribers

Create a subscriber for an event:

```bash
meridian generate subscriber issue.created
```

This generates:

```text
src/subscribers/issue-created.ts
```

Subscriber contract:

- Default export: async handler function
- Named export: `config` with `event` (string or string array)

Example:

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

Subscribers are auto-loaded from `src/subscribers/` at bootstrap.
