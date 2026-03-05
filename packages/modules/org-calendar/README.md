# @meridianjs/org-calendar

Organisation calendar module for MeridianJS. Stores the organisation's working-day schedule and public holidays. Used by the Gantt chart to calculate business-day durations and display non-working days.

Auto-loaded by `@meridianjs/meridian` — you do not need to add this to `modules[]` yourself.

## Service: `orgCalendarModuleService`

```typescript
const svc = req.scope.resolve("orgCalendarModuleService") as any
```

### Methods

```typescript
// Get or create the singleton calendar record
const calendar = await svc.getOrCreateCalendar()
// → { id, working_days: { mon, tue, wed, thu, fri, sat, sun }, timezone }

// Update working days
await svc.updateOrgCalendar(calendar.id, {
  working_days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
  timezone: "America/New_York",
})

// List holidays for a given year (includes recurring holidays from any year)
const holidays = await svc.listHolidaysByYear(2025)

// Standard CRUD
await svc.createOrgHoliday({ name: "New Year", date: new Date("2025-01-01"), recurring: true })
await svc.updateOrgHoliday(id, data)
await svc.deleteOrgHoliday(id)
```

## Default Working Days

On first access, the calendar is seeded with:

```
Mon – Fri: working  ✓
Sat – Sun: off      ✗
```

## Data Models

### OrgCalendar

Singleton record — only one per organisation.

| Field | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `working_days` | `json` | Map of `{ mon, tue, wed, thu, fri, sat, sun }` booleans |
| `timezone` | `text` | IANA timezone string (nullable) |
| `created_at` | `datetime` | — |
| `updated_at` | `datetime` | — |

### OrgHoliday

| Field | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `name` | `text` | Holiday name (e.g. `"Christmas"`) |
| `date` | `datetime` | Date of the holiday |
| `recurring` | `boolean` | `true` = repeats every year on same month/day |
| `created_at` | `datetime` | — |

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET/PUT` | `/admin/org/calendar` | Get / update the working-day schedule |
| `GET/POST` | `/admin/org/holidays` | List / create holidays |
| `PUT/DELETE` | `/admin/org/holidays/:id` | Update / delete a holiday |

## License

MIT
