import { AsyncLocalStorage } from "node:async_hooks"
import type { MeridianContainer } from "@meridian/types"

export interface WorkflowRunContextStore {
  container: MeridianContainer
  /** LIFO compensation stack — each entry undoes one completed step */
  compensationStack: Array<() => Promise<void>>
}

/** Thread-local-like storage for the currently running workflow */
export const workflowRunContext = new AsyncLocalStorage<WorkflowRunContextStore>()

/** Returns the current workflow run context, or throws if called outside a workflow */
export function getWorkflowRunContext(): WorkflowRunContextStore {
  const ctx = workflowRunContext.getStore()
  if (!ctx) {
    throw new Error(
      "No active workflow context. Steps must be called inside a createWorkflow constructor function."
    )
  }
  return ctx
}
