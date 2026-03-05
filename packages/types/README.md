# @meridianjs/types

Shared TypeScript interfaces and types for the MeridianJS ecosystem. This package is a pure type declaration library — no runtime code, no dependencies.

## Installation

```bash
npm install @meridianjs/types
```

## Overview

All public contracts between MeridianJS packages live here. Consuming packages import from `@meridianjs/types` rather than from each other, keeping the dependency graph flat and preventing circular imports.

## Exported Types

### Container & DI

```typescript
import type { MeridianContainer } from "@meridianjs/types"

// The DI container interface — resolve tokens, register values, create child scopes
interface MeridianContainer {
  resolve<T = unknown>(token: string): T
  register(registrations: Record<string, unknown>): void
  createScope(): MeridianContainer
  dispose?(): Promise<void>
}
```

### Module System

```typescript
import type { ModuleDefinition, LoaderFn, LoaderOptions, LinkableConfig } from "@meridianjs/types"
```

### Configuration

```typescript
import type { MeridianConfig, ProjectConfig, ModuleConfig, PluginConfig } from "@meridianjs/types"
```

### Event Bus

```typescript
import type { IEventBus, EventMessage, SubscriberFn, SubscriberArgs, SubscriberConfig } from "@meridianjs/types"
```

### Scheduler

```typescript
import type { IScheduler, ScheduledJobConfig } from "@meridianjs/types"
```

### HTTP / Auth

```typescript
import type { AuthenticatedUser, MeridianRequestBase } from "@meridianjs/types"

// JWT payload shape attached to req.user
interface AuthenticatedUser {
  id: string
  workspaceId: string
  roles: string[]
  permissions: string[]
}
```

### Logger

```typescript
import type { ILogger } from "@meridianjs/types"
```

### Domain Enums

```typescript
import type {
  IssueType,       // "bug" | "feature" | "task" | "epic" | "story"
  IssuePriority,   // "urgent" | "high" | "medium" | "low" | "none"
  SprintStatus,    // "planned" | "active" | "completed"
  ProjectVisibility,
  WorkspacePlan,
} from "@meridianjs/types"
```

### Storage & Email

```typescript
import type { IStorageProvider, IEmailService, EmailSendOptions } from "@meridianjs/types"
```

### Plugin System

```typescript
import type { PluginRegistrationContext, PluginRegisterFn } from "@meridianjs/types"
```

## License

MIT
