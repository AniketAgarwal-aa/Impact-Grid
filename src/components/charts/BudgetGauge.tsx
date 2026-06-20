/** Semi-circle budget utilization gauge */
import { ResponsiveContainer, PieChart, Pie } from "recharts";

interface BudgetGaugeProps {
  percentage: number;
  label?: string;
  height?: number;
  usedAmount?: string;
  remainingAmount?: string;
  totalAmount?: string;
}

export function BudgetGauge({
  percentage,
  label = "Budget Used",
  height = 150,
  usedAmount,
  remainingAmount,
  totalAmount,
}: BudgetGaugeProps) {
  const pct = Math.min(100, Math.max(0, Math.round(percentage)));
  const color = pct > 85 ? "#ef4444" : pct > 70 ? "#f59e0b" : "#10b981";

  return (
    <div>
      <div className="relative mx-auto" style={{ height, maxWidth: 280 }}>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={[
                { value: pct, fill: color },
                { value: 100 - pct, fill: "hsl(var(--muted))" },
              ]}
              cx="50%"
              cy="88%"
              startAngle={180}
              endAngle={0}
              innerRadius="58%"
              outerRadius="78%"
              dataKey="value"
              stroke="none"
            />
          </PieChart>
        </ResponsiveContainer>
        <div
          className="absolute inset-x-0 text-center pointer-events-none"
          style={{ bottom: height * 0.22 }}
        >
          <div className="text-3xl font-black tabular-nums">{pct}%</div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">
            {label}
          </div>
        </div>
      </div>
      {(usedAmount || remainingAmount || totalAmount) && (
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
          {usedAmount && (
            <div className="rounded-lg bg-accent/50 p-2">
              <div className="font-semibold text-foreground">{usedAmount}</div>
              <div className="text-muted-foreground">Used</div>
            </div>
          )}
          {remainingAmount && (
            <div className="rounded-lg bg-accent/50 p-2">
              <div className="font-semibold text-emerald-600">{remainingAmount}</div>
              <div className="text-muted-foreground">Remaining</div>
            </div>
          )}
          {totalAmount && (
            <div className="rounded-lg bg-accent/50 p-2">
              <div className="font-semibold text-foreground">{totalAmount}</div>
              <div className="text-muted-foreground">Total</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
