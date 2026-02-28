import { useWidgets, type Zone, type ZonePropMap } from "@/lib/widget-registry"

export function WidgetZone<Z extends Zone>({
  zone,
  props,
}: {
  zone: Z
  props: ZonePropMap[Z]
}) {
  const widgets = useWidgets(zone)
  if (!widgets.length) return null
  return (
    <>
      {widgets.map((Widget, i) => (
        // props cast is intentional: type safety is enforced at registration time
        // via WidgetDefinition<Z>; key uses component name for stable reconciliation
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <Widget key={Widget.displayName ?? Widget.name ?? i} {...(props as any)} />
      ))}
    </>
  )
}
