import React, { createContext, useContext } from "react"
import type { Issue } from "@/api/hooks/useIssues"

export type ZonePropMap = {
  "issue.details.before":      { issue: Issue }
  "issue.details.after":       { issue: Issue }
  "issue.details.sidebar":     { issue: Issue }
  "project.board.before":      { projectId: string }
  "project.board.after":       { projectId: string }
  "project.issues.before":     { projectId: string }
  "project.issues.after":      { projectId: string }
  "project.timeline.before":   { projectId: string }
  "project.timeline.after":    { projectId: string }
  "project.sprints.before":    { projectId: string }
  "project.sprints.after":     { projectId: string }
  "workspace.settings.before": { workspaceId: string }
  "workspace.settings.after":  { workspaceId: string }
}

export type Zone = keyof ZonePropMap

export type WidgetDefinition<Z extends Zone = Zone> = {
  zone: Z
  component: React.ComponentType<ZonePropMap[Z]>
}

// Distributive union — each member has a concrete zone + matching component type.
// Use this for arrays that may contain widgets for different zones.
export type AnyWidgetDefinition = { [Z in Zone]: WidgetDefinition<Z> }[Zone]

const WidgetRegistryContext = createContext<AnyWidgetDefinition[]>([])

export function WidgetRegistryProvider({
  widgets,
  children,
}: {
  widgets: AnyWidgetDefinition[]
  children: React.ReactNode
}) {
  return React.createElement(WidgetRegistryContext.Provider, { value: widgets }, children)
}

export function useWidgets<Z extends Zone>(zone: Z): React.ComponentType<ZonePropMap[Z]>[] {
  const all = useContext(WidgetRegistryContext)
  return all
    .filter((w) => w.zone === zone)
    .map((w) => w.component) as React.ComponentType<ZonePropMap[Z]>[]
}
