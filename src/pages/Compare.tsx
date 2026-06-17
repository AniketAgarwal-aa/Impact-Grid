import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/services/api";
import { useCurrencyStore } from "@/stores/currencyStore";
import { toast } from "@/components/common/Toast";
import { StatusBadge } from "@/components/common/StatusBadge";
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

export default function Compare() {
  const [searchParams] = useSearchParams();
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [allScenarios, setAllScenarios] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [comparison, setComparison] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const { format, convert, currency } = useCurrencyStore();

  useEffect(() => {
    api
      .getScenarios()
      .then(setAllScenarios)
      .catch(() => {});
    const ids = searchParams.get("ids");
    if (ids) {
      const parsed = ids.split(",").map(Number).filter(Boolean);
      setSelected(parsed);
    }
  }, []);

  useEffect(() => {
    if (selected.length >= 2) {
      setLoading(true);
      api
        .compareScenarios(selected)
        .then(setComparison)
        .catch(() => toast.error("Comparison failed"))
        .finally(() => setLoading(false));
    }
  }, [selected]);

  const toggleSelect = (id: number) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );

  const COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899"];
  const chartData =
    comparison?.scenarios?.map((s: unknown) => ({
      name: s.scenario_name,
      cost: convert(s.cost.increase, s.currency),
      time: s.time.increase,
      effort: s.effort.increase,
      risk: s.risk.score,
    })) || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Compare Scenarios</h1>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-3">
          Select scenarios to compare (min 2)
        </h3>
        <div className="flex flex-wrap gap-2">
          {allScenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => toggleSelect(s.id)}
              className={`rounded-xl border px-4 py-2 text-sm transition-all ${selected.includes(s.id) ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/30"}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {comparison && comparison.scenarios?.length >= 2 && (
        <>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-4">Impact Comparison Chart</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="cost"
                  name={`Cost (${currency})`}
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="time"
                  name="Time (days)"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="risk"
                  name="Risk Score"
                  fill="#a855f7"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Comparison Table */}
          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-accent/50">
                  <th className="p-4 text-left font-semibold">Metric</th>
                  {comparison.scenarios.map((s: unknown) => (
                    <th
                      key={s.scenario_id}
                      className="p-4 text-center font-semibold"
                    >
                      {s.scenario_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  "Change Size",
                  "Cost Increase",
                  "Time Increase",
                  "Effort Increase",
                  "Risk Level",
                  "Risk Score",
                ].map((metric, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/50 hover:bg-accent/30"
                  >
                    <td className="p-4 font-medium">{metric}</td>
                    {comparison.scenarios.map((s: unknown) => {
                      const vals: Record<string, any> = {
                        "Change Size": s.change_size,
                        "Cost Increase": format(
                          convert(s.cost.increase, s.currency),
                        ),
                        "Time Increase": `${s.time.increase} days`,
                        "Effort Increase": `${s.effort.increase} days of work`,
                        "Risk Level": <StatusBadge status={s.risk.level} />,
                        "Risk Score": `${s.risk.score}/100`,
                      };
                      return (
                        <td key={s.scenario_id} className="p-4 text-center">
                          {vals[metric]}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
