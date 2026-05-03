import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { name: string; risk: number }[];
}

export const RiskTrendLine = ({ data }: Props) => (
  <ResponsiveContainer width="100%" height={280}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
      <XAxis
        dataKey="name"
        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
      />
      <YAxis
        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
        domain={[0, 100]}
      />
      <Tooltip
        contentStyle={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: 8,
          color: "hsl(var(--foreground))",
        }}
      />
      <Line
        type="monotone"
        dataKey="risk"
        stroke="hsl(var(--destructive))"
        strokeWidth={2}
        dot={{ fill: "hsl(var(--destructive))", r: 4 }}
        name="Risk Score"
      />
    </LineChart>
  </ResponsiveContainer>
);
