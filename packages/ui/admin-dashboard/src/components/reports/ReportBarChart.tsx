import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts"

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-medium mb-0.5">{label}</p>
      <p className="text-muted-foreground">{formatMinutes(payload[0]?.value ?? 0)}</p>
    </div>
  )
}

interface ReportBarChartProps {
  data: { name: string; minutes: number }[]
  icon: React.ReactNode
  title: string
  barColor?: string
  yAxisWidth?: number
  rightMargin?: number
  minRowHeight?: number
}

export function ReportBarChart({
  data,
  icon,
  title,
  barColor = "#6366f1",
  yAxisWidth = 100,
  rightMargin = 40,
  minRowHeight = 80,
}: ReportBarChartProps) {
  if (data.length === 0) return null
  return (
    <div className="bg-white dark:bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(minRowHeight, data.length * 36)}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: rightMargin, top: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
          <XAxis
            type="number"
            tickFormatter={(v) => formatMinutes(v)}
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={yAxisWidth}
            tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
          <Bar dataKey="minutes" fill={barColor} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
