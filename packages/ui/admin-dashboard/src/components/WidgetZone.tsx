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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <Widget key={i} {...(props as any)} />
      ))}
    </>
  )
}
