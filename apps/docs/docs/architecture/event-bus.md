---
id: event-bus
title: Event Bus
description: LocalEventBus vs RedisEventBus, emitting events, and subscriber auto-load.
sidebar_position: 6
---

# Event Bus

The event bus decouples domain mutations from their side effects. Workflows emit events; subscribers react to them. The bus implementation is swappable via a single config line.

---

## Local vs Redis

| Package | Transport | Use case |
|---|---|---|
| `@meridianjs/event-bus-local` | Node.js `EventEmitter` | Development, single-process |
| `@meridianjs/event-bus-redis` | BullMQ + ioredis | Production, multi-process |

Switch by changing `modules[]` in `meridian.config.ts`:

```typescript
// Development
{ resolve: '@meridianjs/event-bus-local' }

// Production
{ resolve: '@meridianjs/event-bus-redis', options: { redisUrl: process.env.REDIS_URL } }
```

Both implement the same `IEventBus` interface — no code changes needed elsewhere.

---

## Emitting Events

Events are emitted from workflow steps:

```typescript
const emitProjectCreatedStep = createStep(
  'emit-project-created',
  async (input: { project: Project }, context) => {
    const eventBus = context.container.resolve('eventBus') as IEventBus
    await eventBus.emit('project.created', {
      project_id: input.project.id,
      workspace_id: input.project.workspace_id,
    })
  }
)
```

Event names follow the `<domain>.<action>` convention.

---

## Subscribers

Subscribers are auto-loaded from `src/subscribers/` (and plugin subscriber directories). Each file must export a default `SubscriberConfig` object:

```typescript
// src/subscribers/on-issue-created.ts
import type { SubscriberConfig, SubscriberArgs } from '@meridianjs/types'

export default {
  event: 'issue.created',
  subscriberId: 'on-issue-created-notify',

  async handler({ data, container }: SubscriberArgs) {
    const notificationSvc = container.resolve('notificationModuleService')
    await notificationSvc.createNotification({
      user_id: data.assignee_id,
      title: 'New issue assigned to you',
      body: `Issue #${data.issue_number} was created`,
      resource_id: data.issue_id,
      resource_type: 'issue',
    })
  },
} satisfies SubscriberConfig
```

---

## Built-in Events

`@meridianjs/meridian` emits these events from its core workflows:

| Event | Payload |
|---|---|
| `project.created` | `{ project_id, workspace_id }` |
| `issue.created` | `{ issue_id, project_id, workspace_id, assignee_id? }` |
| `issue.status_changed` | `{ issue_id, project_id, old_status, new_status }` |
| `issue.assigned` | `{ issue_id, project_id, assignee_id }` |
| `sprint.completed` | `{ sprint_id, project_id, completed_count, carried_over_count }` |
| `comment.created` | `{ comment_id, issue_id, author_id }` |

---

## Subscribing to Multiple Events

A single subscriber file can handle multiple events by using an array:

```typescript
export default {
  event: ['issue.created', 'issue.assigned'],
  subscriberId: 'on-issue-notifications',
  async handler({ event, data, container }: SubscriberArgs) {
    if (event === 'issue.created') { /* ... */ }
    if (event === 'issue.assigned') { /* ... */ }
  },
} satisfies SubscriberConfig
```
