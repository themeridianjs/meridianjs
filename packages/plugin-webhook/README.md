# @meridianjs/plugin-webhook

Webhook receiver plugin for MeridianJS. Provides a `WebhookEvent` module for storing inbound webhook payloads and a `POST /webhooks` endpoint for receiving them.

## Installation

```bash
npm install @meridianjs/plugin-webhook
```

## Configuration

```typescript
// meridian.config.ts
export default defineConfig({
  plugins: [
    { resolve: "@meridianjs/meridian" },
    { resolve: "@meridianjs/plugin-webhook" },
  ],
})
```

The plugin self-registers its `WebhookEvent` module and auto-scans its own `api/` and `subscribers/` directories.

## How It Works

Inbound HTTP requests to `POST /webhooks` are validated and stored as `WebhookEvent` records via `webhookModuleService`. You can write a subscriber to react to `webhook.received` events:

```typescript
// src/subscribers/on-webhook.ts
import type { SubscriberArgs, SubscriberConfig } from "@meridianjs/types"

export default async function handler({ event, container }: SubscriberArgs) {
  const { source, payload } = event.data as any
  // ... handle the webhook payload
}

export const config: SubscriberConfig = {
  event: "webhook.received",
}
```

## Service: `webhookModuleService`

Auto-generated CRUD operations are available on the service:

```typescript
const svc = container.resolve("webhookModuleService") as any

// List all received webhook events
const events = await svc.listWebhookEvents()

// Retrieve a specific event
const event = await svc.retrieveWebhookEvent(id)
```

## Writing Your Own Plugin

This plugin demonstrates the standard MeridianJS plugin structure:

```typescript
// packages/my-plugin/src/index.ts
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { PluginRegistrationContext } from "@meridianjs/types"
import MyModule from "./module/index.js"

// Tells the framework where to find api/, subscribers/, jobs/, links/
export const pluginRoot = path.dirname(fileURLToPath(import.meta.url))

export default async function register(ctx: PluginRegistrationContext): Promise<void> {
  await ctx.addModule({ resolve: MyModule })
}
```

## License

MIT
