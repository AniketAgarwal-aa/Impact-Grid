import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Props {
  data: { name: string; projected: number; current: number }[];
}

export const ImpactBarChart = ({ data }: Props) => (
  <ResponsiveContainer width="100%" height={280}>
    <BarChart data={data} barGap={4}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
      <XAxis
        dataKey="name"
        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
      />
      <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
      <Tooltip
        contentStyle={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: 8,
          color: "hsl(var(--foreground))",
        }}
      />
      <Legend />
      <Bar
        dataKey="projected"
        fill="hsl(var(--primary) / 0.3)"
        radius={[4, 4, 0, 0]}
        name="Projected"
      />
      <Bar
        dataKey="current"
        fill="hsl(var(--primary))"
        radius={[4, 4, 0, 0]}
        name="Current Impact"
      />
    </BarChart>
  </ResponsiveContainer>
);
