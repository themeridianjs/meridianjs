import type { AnyWidgetDefinition } from "@/lib/widget-registry"

export function defineWidgets(defs: AnyWidgetDefinition[]): AnyWidgetDefinition[] {
  return defs
}

export type { WidgetDefinition, AnyWidgetDefinition, Zone, ZonePropMap } from "@/lib/widget-registry"
