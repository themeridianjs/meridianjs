import { AsyncLocalStorage } from "node:async_hooks"
import type { MikroORM, EntityManager } from "@mikro-orm/core"

/**
 * Per-invocation EntityManager isolation.
 *
 * A MikroORM EntityManager is stateful and NOT concurrency-safe: its identity
 * map accumulates every entity it loads and its unit-of-work batches pending
 * changes until flush(). Sharing one boot-time fork across all requests causes
 * unbounded memory growth and cross-request data races.
 *
 * `runInOrmContext(fn)` establishes an async-local scope. Within it,
 * `getContextEm(orm)` returns a single fork per ORM for the whole scope — so
 * a find() followed by a flush() in the same request share one EM — while
 * concurrent requests each get their own.
 *
 * Outside any context (scripts, direct service calls in tests), a per-ORM
 * singleton fork is used as a fallback so create()+flush() still work; this
 * matches the pre-context behavior. Wrap HTTP requests, subscribers, and jobs
 * in runInOrmContext to get real isolation.
 */
const storage = new AsyncLocalStorage<Map<MikroORM, EntityManager>>()

/** Fallback forks for work that runs outside any ORM context. */
const fallbackEms = new WeakMap<MikroORM, EntityManager>()

export function runInOrmContext<T>(fn: () => T): T {
  return storage.run(new Map(), fn)
}

/** True when the current async execution is inside runInOrmContext. */
export function hasOrmContext(): boolean {
  return storage.getStore() !== undefined
}

export function getContextEm(orm: MikroORM): EntityManager {
  const store = storage.getStore()
  if (store) {
    let em = store.get(orm)
    if (!em) {
      em = orm.em.fork()
      store.set(orm, em)
    }
    return em
  }

  // No context — reuse a stable per-ORM fork so multi-step operations
  // (create → persistAndFlush) resolve the same EM.
  let em = fallbackEms.get(orm)
  if (!em) {
    em = orm.em.fork()
    fallbackEms.set(orm, em)
  }
  return em
}
