---
id: di-container
title: DI Container
description: Awilix PROXY mode, container.register rules, and module scopes.
sidebar_position: 3
---

# Dependency Injection Container

MeridianJS uses [Awilix](https://github.com/jeffijoe/awilix) in **PROXY mode** for dependency injection. Understanding the container's auto-detection rules will save you from subtle bugs.

---

## How `container.register()` Works

Awilix auto-detects the registration type based on the value you pass:

| Value type | Registration as |
|---|---|
| Class with >1 prototype methods | `asClass` (instantiated per resolve) |
| Plain function | `asFunction` |
| Anything else (string, number, object, class instance) | `asValue` |

**Critical rule: always pass raw values — never wrap with `asValue()`.**

```typescript
// CORRECT — pass the raw value
container.register({ config, logger })

// WRONG — double-wraps: resolve() returns the Resolver object, not the value
container.register({ config: asValue(config) })
```

---

## Root Container vs Module Scopes

The framework creates a single **root container** at startup. Each module gets an isolated **child scope** (`container.createScope()`) so that module-specific repositories and ORM instances don't leak into other modules:

```
Root Container
├── config
├── logger
├── eventBus
└── Module Scopes (child containers)
    ├── projectModuleService
    │   ├── projectRepository
    │   ├── labelRepository
    │   └── projectOrm
    ├── issueModuleService
    │   ├── issueRepository
    │   └── issueOrm
    └── ...
```

A module child scope inherits everything from the root but its registrations don't propagate back up.

---

## Resolving Services in Route Handlers

Each HTTP request gets a request-scoped container (a child of the root) accessible via `req.scope`:

```typescript
// Route handler — src/api/admin/projects/route.ts
export async function GET(req: any, res: any) {
  // CORRECT: cast after resolve — req is typed as 'any', type arg causes TS2347
  const svc = req.scope.resolve('projectModuleService') as ProjectModuleService

  const projects = await svc.listProjects()
  res.json(projects)
}
```

:::warning No type arguments on `resolve()`
TypeScript will reject `req.scope.resolve<MyService>("key")` because `req` is typed as `any`, making `req.scope` also `any`. Always cast after the call instead:
```typescript
const svc = req.scope.resolve('myService') as MyService
```
:::

---

## Manual Service Instantiation

Module services are never registered with Awilix as classes. Instead, the framework instantiates them directly:

```typescript
// Framework does this internally:
const serviceInstance = new ServiceClass(moduleContainer)
container.register({ projectModuleService: serviceInstance })
```

This is because Awilix PROXY mode passes a proxy object as the constructor argument, not the real `MeridianContainer`. Manual instantiation ensures the container reference in the service is the actual scoped container.

---

## Registering Your Own Values

In a custom loader or plugin `register()` function, you can add anything to the container:

```typescript
export default async function defaultLoader({ container }: LoaderOptions) {
  const redisClient = new Redis(process.env.REDIS_URL)

  // Raw value — auto-detected as asValue
  container.register({ redisClient })

  // Class — auto-detected as asClass, instantiated lazily
  container.register({ myHelperService: MyHelperService })
}
```
