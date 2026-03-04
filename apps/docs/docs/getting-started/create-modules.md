---
id: create-modules
title: How to Create Modules
description: Scaffold and register a custom Meridian module.
sidebar_position: 4
---

# How to Create Modules

Create a module:

```bash
meridian generate module time-log
```

Generated files:

```text
src/modules/time-log/index.ts
src/modules/time-log/models/time-log.ts
src/modules/time-log/loaders/default.ts
src/modules/time-log/service.ts
```

Register the module in `meridian.config.ts`:

```ts
export default defineConfig({
  // ...
  modules: [
    { resolve: "@meridianjs/event-bus-local" },
    { resolve: "./src/modules/time-log" },
  ],
  plugins: [
    { resolve: "@meridianjs/meridian" },
  ],
})
```

Then sync schema:

```bash
npm run db:migrate
```
