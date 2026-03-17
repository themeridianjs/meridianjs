# Coding Conventions

**Analysis Date:** 2026-03-17

## Naming Patterns

**Files:**
- Backend services: `service.ts` (e.g., `packages/modules/project/src/service.ts`)
- Models/Schemas: `{name}.ts` in `models/` directory (e.g., `packages/modules/project/src/models/project.ts`)
- Test files: `{module}.test.ts` (e.g., `packages/framework/src/validate.test.ts`)
- Route handlers: `route.ts` in path-based directories (e.g., `packages/meridian/src/api/admin/projects/route.ts`)
- Dynamic route segments: `[param]/route.ts` (e.g., `packages/meridian/src/api/admin/projects/[id]/route.ts`)
- Workflows: `{action}-{entity}.ts` in `workflows/` (e.g., `packages/meridian/src/workflows/create-project.ts`)
- React components: PascalCase file names (e.g., `LoginPage.tsx`, `WidgetZone.tsx`)
- React hooks: `use{Name}.ts` (e.g., `useRealtimeEvents.ts`, `useAuth.ts`)
- Utilities: camelCase (e.g., `businessDays.ts`, `time-utils.ts`)

**Functions:**
- camelCase: `listProjects()`, `retrieveProject()`, `generateIdentifier()`
- Service methods (auto-generated CRUD): `list{Model}s()`, `retrieve{Model}()`, `create{Model}()`, `update{Model}()`, `delete{Model}()`, `softDelete{Model}()`
- Middleware/handlers: camelCase (e.g., `authenticateJWT()`, `validate()`, `requirePermission()`)
- React component names: PascalCase (e.g., `LoginPage`, `WidgetZone`)
- React hooks: `use` prefix + PascalCase (e.g., `useAuth()`, `useLogin()`, `useRealtimeEvents()`)

**Variables:**
- camelCase for all variables and constants
- SQL/database identifiers: snake_case (e.g., `workspace_id`, `project_id`, `deleted_at`, `created_at`)
- Private class fields: `#fieldName` (e.g., `#container` in service classes)
- React state: `const [state, setState] = useState()`

**Types:**
- Interfaces: PascalCase + `Interface` suffix optional (e.g., `AuthResponse`, `CreateProjectInput`, `ZonePropMap`)
- Type aliases: PascalCase (e.g., `ModelSchema`, `PropertyType`, `Zone`)
- Generics: Single capital letters or descriptive (e.g., `<T>`, `<Z extends Zone>`)
- Enums: PascalCase values in TypeScript enums, lowercase strings in model definitions (e.g., `visibility: model.enum(["private", "public", "workspace"])`)

## Code Style

**Formatting:**
- No explicit linter/formatter configured; inferred style: 2-space indentation, no semicolons encouraged in some cases
- tsup build tool: both ESM and CJS output (except `@meridianjs/framework` which is ESM-only)
- TypeScript target: ES2022, module resolution: NodeNext

**Linting:**
- No ESLint config detected; project relies on TypeScript compiler for type safety
- `typecheck` script: `tsc --noEmit` runs on `npm run typecheck`

**Import Statements:**
- ESM imports required throughout (with `.js` extension for local imports in ESM packages)
- Example: `import ProjectModel from "./models/project.js"` (even though source is `.ts`)
- Type imports: `import type { ... } from "..."`
- Path aliases: `@/...` used in React frontend code (configured in vite.config.ts)

## Import Organization

**Order:**
1. External dependencies (e.g., `express`, `jwt`, `zod`)
2. Type-only imports (e.g., `import type { Request, Response }`)
3. Internal framework imports (e.g., `@meridianjs/types`, `@meridianjs/framework-utils`)
4. Local relative imports (e.g., `./service.js`, `./models/project.js`)

**Path Aliases:**
- React frontend: `@/` prefix maps to `packages/ui/admin-dashboard/src/` (configured in vite)
- Example: `import { WidgetZone } from "@/components/WidgetZone"`

## Error Handling

**Patterns:**
- Middleware: respond directly with `res.status(code).json({ error: { message, details? } })`
- Services: throw errors with optional `.status` property (e.g., `Object.assign(new Error("Conflict"), { status: 409 })`)
- Routes: wrap service calls in try-catch or return early on validation failure
- Async errors: use `catch` blocks or `.catch(() => null)` for optional checks
- Session validation: fail-closed (return 401) when DB unavailable to prevent revoked sessions from being treated as valid

**Error Response Shape:**
```json
{ "error": { "message": "User-facing message", "details": { "field": ["error string"] } } }
```

**Status Codes:**
- 400: Validation error
- 401: Unauthorized (missing/invalid token, expired session)
- 403: Forbidden (user lacks permission)
- 404: Not found
- 409: Conflict (e.g., duplicate identifier)
- 500: Server error (returned on workflow reverts after error)

## Logging

**Framework:** No dedicated logger detected; uses `logger` resolved from DI container

**Patterns:**
- Log errors at WARN level: `logger.warn("[auth] jti session check failed: ...")`
- Graceful degradation: catch logger unavailability without failing the request

## Comments

**When to Comment:**
- Function/method JSDoc: Always document public APIs
- Inline comments: Complex logic, surprising behavior, workarounds
- TODOs/FIXMEs: Not commonly used (no grep results found)

**JSDoc/TSDoc:**
- Format: `/** ... */` for public functions and exports
- Include `@example` for complex utilities (e.g., DML property definitions)
- Type parameters documented in description (e.g., "Generic T represents...")

**Example:**
```typescript
/**
 * Express middleware that validates `req.body` against a Zod schema.
 * On success, replaces `req.body` with the parsed (coerced/stripped) value and calls `next()`.
 * On failure, responds 400 with a structured error including per-field details.
 *
 * @example
 * const loginSchema = z.object({ email: z.string().email() })
 * export const POST = [validate(loginSchema), handler]
 */
export function validate(schema: ZodSchema) { ... }
```

## Function Design

**Size:** Prefer small, focused functions; largest seen is ~126 lines (ProjectModuleService) due to CRUD method generation

**Parameters:**
- Use object destructuring for multiple parameters: `async ({ container }: LoaderOptions) => { ... }`
- Optional params included in destructured object
- Callbacks/handlers: prefer trailing callback in middleware chain

**Return Values:**
- Services: return entities or array of entities (never null on retrieval — throw error instead)
- Optional retrieval: use `.catch(() => null)` pattern to convert errors to null
- Workflows: return `WorkflowResponse(result)` wrapping the entity
- Middleware: call `next()` on success, respond directly on failure (no return value needed)

## Module Design

**Exports:**
- Modules: export default `Module(key, definition)` from index.ts
- Services: export the service class (e.g., `export { ProjectModuleService }`)
- Models: export default model definition (e.g., `export default Project`)
- Utilities: named exports preferred for utilities (e.g., `export function validate(...)`)

**Barrel Files:**
- Not heavily used; most imports are direct
- Example: `packages/meridian/src/workflows/emit-event.ts` exported from workflow files

**Module Naming Convention:**
- Singular lowercase in directory: `packages/modules/project/src/`
- Plural service name: `projectModuleService` (resolved key in container)
- Plural generated methods: `listProjects()`, `createProjects()` (from singular model name)

## Data Models

**Schema Definition (DML):**
```typescript
const MyModel = model.define("table_name", {
  id: model.id().primaryKey(),
  name: model.text().nullable(),
  count: model.number().default(0),
  status: model.enum(["active", "inactive"]).default("active"),
  metadata: model.json().nullable(),
  created_at: model.date(),
}, [
  { columns: ["workspace_id"] },  // Index
  { columns: ["email"], unique: true, name: "uq_table_email" },  // Unique constraint
])
```

**Column Naming:**
- snake_case for all DB columns
- Primary key: always `id` (UUID)
- Timestamps: auto-managed (`created_at`, `updated_at`, `deleted_at`)
- Denormalized FK: `{entity}_id` (e.g., `workspace_id`, `project_id`, `owner_id`)
- Share tokens: `share_token`
- Enum values: lowercase strings (not TypeScript enums)
- JSON columns: `metadata` for custom integrations

## React/Frontend Conventions

**Component Structure:**
```typescript
export function ComponentName() {
  const [state, setState] = useState(initialValue)
  const { data } = useQuery({ ... })
  const mutation = useMutation({ ... })

  const handleEvent = (e: React.SomeEvent) => { ... }

  return (
    <div className="...">
      {/* Content */}
    </div>
  )
}
```

**Hooks:**
- Always use React Query (TanStack Query v5) for server state: `useQuery()`, `useMutation()`
- Custom hooks for component logic: `useRealtimeEvents()`, `useAuth()`
- Zustand stores for app state: `useAuth()` from `stores/auth.tsx`
- Query keys: array of strings/values for cache invalidation (e.g., `["issues"], ["projects", projectId]`)

**Styling:**
- TailwindCSS utility classes
- shadcn/ui components from `@/components/ui/` for base components
- Custom color scheme: zinc base with indigo accents (monochromatic Linear.app-inspired design)
- Font: DM Sans (via Tailwind config)

**Component Patterns:**
- Dialog/Modal: Use shadcn/ui `Dialog` with custom wrapper dialogs (e.g., `CreateProjectDialog`)
- Form validation: Zod schemas + React Hook Form (inferred from API structure)
- Loading states: React Query handles `isLoading`, `isPending` states
- Error handling: `.error` property from mutations (e.g., `onError: (err) => toast.error(err.message)`)

**Type-Safe Props:**
```typescript
type IssuePropMap = {
  "issue.details.before": { issue: Issue }
  "issue.details.after": { issue: Issue }
  "issue.details.sidebar": { issue: Issue }
}

type Zone = keyof IssuePropMap

type WidgetDefinition<Z extends Zone = Zone> = {
  zone: Z
  component: React.ComponentType<IssuePropMap[Z]>
}
```

## Reserved Fields

**Never overwrite via `updateProject()` or similar:**
- `id` (primary key)
- `created_at` (auto-managed)
- `updated_at` (auto-managed)
- `deleted_at` (only set by `softDelete()`)
- `__proto__`, `constructor`, `prototype` (prototype pollution defense)

---

*Convention analysis: 2026-03-17*
