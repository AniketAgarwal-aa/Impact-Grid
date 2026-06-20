/**
 * Reusable impact analysis charts — used on Results, Project Detail, and per-requirement views.
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  AreaChart, Area, LineChart, Line, ComposedChart,
  ScatterChart, Scatter, ZAxis, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { TrendingUp, Clock, Users, AlertTriangle, Activity, CheckCircle } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { BudgetGauge } from "@/components/charts/BudgetGauge";
import { QualityMetricsCards } from "@/components/charts/QualityMetricsCards";
import { useCurrencyStore } from "@/stores/currencyStore";
import {
  type AnalysisLike,
  buildBurndownFromAnalysis,
  buildImpactDistribution,
} from "@/utils/analysisCharts";

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e"];
const PIE_COLORS   = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

/** Tooltip style — works in BOTH light and dark mode */
const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
  boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
};
const tooltipItemStyle  = { color: "hsl(var(--foreground))" };
const tooltipLabelStyle = { color: "hsl(var(--muted-foreground))", fontWeight: 600 as const };
const legendFormatter   = (value: string) => (
  <span style={{ color: "hsl(var(--foreground))", fontSize: "12px" }}>{value}</span>
);
const axisTick = { fill: "hsl(var(--foreground))" };

function ChartCard({
  title, icon: Icon, color, children, className = "",
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card/80 p-4 ${className}`}>
      <h3 className="font-semibold flex items-center gap-2 mb-3 text-sm">
        <Icon className={`h-4 w-4 ${color}`} />
        {title}
      </h3>
      {children}
    </div>
  );
}

export function AnalysisChartsPanel({
  analysis,
  mode = "full",
  title,
  showKpis = true,
}: {
  analysis: AnalysisLike;
  mode?: "full" | "compact";
  title?: string;
  showKpis?: boolean;
}) {
  const { format, convert, formatCompact } = useCurrencyStore();
  const currency = analysis.currency || "INR";

  const cost     = analysis.cost_impact    || {};
  const time     = analysis.time_impact    || {};
  const effort   = analysis.effort_impact  || {};
  const riskBd   = analysis.risk_breakdown || {};
  const costBd   = cost.breakdown   || {};
  const timeBd   = time.breakdown   || {};
  const effortBd = effort.breakdown || {};
  const components = analysis.affected_components || [];
  const recs       = analysis.recommendations    || [];

  const costBreakdownData = Object.entries(costBd).map(([k, v]) => ({
    name: k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, " "),
    value: convert(v as number, currency),
  }));
  const timeBreakdownData = Object.entries(timeBd).map(([k, v]) => ({
    name: k.charAt(0).toUpperCase() + k.slice(1),
    value: v as number,
  }));
  const effortPieData = [
    { name: "Senior",    value: effortBd.senior || 0 },
    { name: "Mid-level", value: effortBd.mid    || 0 },
    { name: "Junior",    value: effortBd.junior  || 0 },
  ].filter((e) => e.value > 0);

  const radarData = [
    { subject: "Schedule",  A: riskBd.schedule  || 0 },
    { subject: "Budget",    A: riskBd.budget    || 0 },
    { subject: "Quality",   A: riskBd.quality   || 0 },
    { subject: "Security",  A: riskBd.security  || 0 },
    { subject: "Technical", A: riskBd.technical || 0 },
  ];

  const costTrendData = [
    { month: "Baseline", cost: Math.round((cost.original || 0) * 0.85) },
    { month: "Phase 1",  cost: Math.round((cost.original || 0) * 0.92) },
    { month: "Phase 2",  cost: cost.original || 0 },
    { month: "Phase 3",  cost: Math.round((cost.new || 0) * 0.96) },
    { month: "Current",  cost: cost.new || 0 },
  ];

  const riskTrendData = [
    { sprint: "S1",  risk: Math.min(100, Math.round((analysis.risk_score || 0) * 1.15)) },
    { sprint: "S2",  risk: Math.min(100, Math.round((analysis.risk_score || 0) * 1.08)) },
    { sprint: "S3",  risk: Math.min(100, Math.round((analysis.risk_score || 0) * 1.02)) },
    { sprint: "Now", risk: analysis.risk_score || 0 },
  ];

  const burndownData = buildBurndownFromAnalysis(analysis);
  const impactDist   = buildImpactDistribution(analysis);

  const costUsedPct = cost.original > 0
    ? Math.min(100, Math.round((cost.new / (cost.original * 1.5)) * 100))
    : 50;
  const timeUsedPct = time.original > 0
    ? Math.min(100, Math.round((time.new / (time.original * 1.3)) * 100))
    : 60;
  const effortUsedPct = effort.original > 0
    ? Math.min(100, Math.round((effort.new / (effort.original * 1.4)) * 100))
    : 55;
  const budgetUsedPct = Math.min(100, Math.round(50 + (cost.percentage || 0)));

  const costBenefitData = components.slice(0, 8).map((c, i) => ({
    x:    (c.estimated_hours || 0) * 500,
    y:    Math.round((c.estimated_hours || 0) * (c.priority === 1 ? 900 : c.priority === 2 ? 700 : 500) * (0.8 + i * 0.05)),
    z:    c.estimated_hours || 0,
    name: c.name,
  }));

  const chartHeight  = mode === "compact" ? 180 : 220;
  const chartMargin  = { top: 4, right: 16, left: 0, bottom: 4 };

  return (
    <div className="space-y-4">
      {title && (
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
          {title}
        </h4>
      )}

      {/* KPI Cards */}
      {showKpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Cost",   value: formatCompact(convert(cost.increase   || 0, currency)), pct: `+${cost.percentage   || 0}%`, icon: TrendingUp,   color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { label: "Time",   value: `+${time.increase   || 0}d`,                            pct: `+${time.percentage   || 0}%`, icon: Clock,         color: "text-blue-500",    bg: "bg-blue-500/10"    },
            { label: "Effort", value: `${effort.increase  || 0}d`,                            pct: `+${effort.percentage || 0}%`, icon: Users,         color: "text-purple-500",  bg: "bg-purple-500/10"  },
            { label: "Risk",   value: `${analysis.risk_score || 0}/100`,                      pct: (analysis.risk_level || "").toUpperCase(), icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-border bg-card p-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg mb-2 ${m.bg}`}>
                <m.icon className={`h-4 w-4 ${m.color}`} />
              </div>
              <div className="text-lg font-bold">{m.value}</div>
              <div className="flex justify-between text-xs mt-0.5">
                <span className="text-muted-foreground">{m.label}</span>
                <span className={`font-bold ${m.color}`}>{m.pct}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Impact Distribution */}
      {impactDist.length > 0 && (
        <ChartCard title="Impact Distribution" icon={BarChart3Icon} color="text-indigo-500">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={impactDist} layout="vertical" margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" fontSize={10} tick={axisTick} tickFormatter={(v) => formatCompact(v)} />
              <YAxis type="category" dataKey="metric" fontSize={10} tick={axisTick} width={48} />
              <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={tooltipItemStyle}
                labelStyle={tooltipLabelStyle}
                cursor={{ fill: "hsl(var(--accent))", opacity: 0.5 }}
              />
              <Legend formatter={legendFormatter} />
              <Bar dataKey="current"   name="Current"   fill="#94a3b8" radius={[0, 4, 4, 0]} />
              <Bar dataKey="projected" name="Projected" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Cost Breakdown + Cost Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Cost Breakdown" icon={TrendingUp} color="text-emerald-500">
          {costBreakdownData.length > 0 ? (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={costBreakdownData} layout="vertical" margin={{ ...chartMargin, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" fontSize={10} tick={axisTick} tickFormatter={(v) => formatCompact(v)} />
                <YAxis type="category" dataKey="name" fontSize={10} tick={axisTick} width={90} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={tooltipItemStyle}
                  labelStyle={tooltipLabelStyle}
                  formatter={(v: number) => [format(v), ""]}
                  cursor={{ fill: "hsl(var(--accent))", opacity: 0.5 }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {costBreakdownData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[160px] items-center justify-center text-muted-foreground text-xs">No cost breakdown data</div>
          )}
        </ChartCard>

        <ChartCard title="Cost Trend" icon={TrendingUp} color="text-indigo-500">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={costTrendData} margin={chartMargin}>
              <defs>
                <linearGradient id="acCostGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" fontSize={10} tick={axisTick} />
              <YAxis fontSize={10} tick={axisTick} tickFormatter={(v) => formatCompact(convert(v, currency))} />
              <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={tooltipItemStyle}
                labelStyle={tooltipLabelStyle}
                formatter={(v: number) => [format(convert(v, currency)), "Cost"]}
              />
              <Area type="monotone" dataKey="cost" name="Cost" stroke="#6366f1" fill="url(#acCostGrad)" strokeWidth={2.5} dot={{ r: 3, fill: "#6366f1" }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Time Breakdown + Effort Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Time Breakdown" icon={Clock} color="text-blue-500">
          {timeBreakdownData.length > 0 ? (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={timeBreakdownData} layout="vertical" margin={{ ...chartMargin, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" fontSize={10} tick={axisTick} unit=" d" />
                <YAxis type="category" dataKey="name" fontSize={10} tick={axisTick} width={85} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={tooltipItemStyle}
                  labelStyle={tooltipLabelStyle}
                  formatter={(v) => [`${v} days`, ""]}
                  cursor={{ fill: "hsl(var(--accent))", opacity: 0.5 }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {timeBreakdownData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[160px] items-center justify-center text-muted-foreground text-xs">No time breakdown data</div>
          )}
        </ChartCard>

        <ChartCard title="Team Effort Distribution" icon={Users} color="text-purple-500">
          {effortPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <PieChart margin={{ top: 0, bottom: 0 }}>
                <Pie
                  data={effortPieData}
                  dataKey="value"
                  cx="50%"
                  cy="44%"
                  innerRadius={mode === "compact" ? 35 : 45}
                  outerRadius={mode === "compact" ? 58 : 72}
                  labelLine={false}
                  paddingAngle={3}
                >
                  {effortPieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(v: number, name: string) => [`${v} days`, name]}
                />
                <Legend verticalAlign="bottom" height={36} formatter={legendFormatter} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-muted-foreground text-xs">No effort data</div>
          )}
        </ChartCard>
      </div>

      {/* Risk Radar + Risk Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Risk Radar" icon={AlertTriangle} color="text-red-500">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="subject" fontSize={10} tick={axisTick} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} />
              <Radar dataKey="A" name="Risk" stroke="#ef4444" fill="#ef4444" fillOpacity={0.25} strokeWidth={2} />
              <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Risk Trend" icon={AlertTriangle} color="text-orange-500">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={riskTrendData} margin={chartMargin}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="sprint" fontSize={10} tick={axisTick} />
              <YAxis fontSize={10} tick={axisTick} domain={[0, 100]} />
              <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={tooltipItemStyle}
                labelStyle={tooltipLabelStyle}
              />
              <Line type="monotone" dataKey="risk" name="Risk Score" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: "#ef4444" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Timeline Burndown + Project Health (full mode only) */}
      {mode === "full" && burndownData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Timeline Burndown" icon={Activity} color="text-sky-500">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart data={burndownData} margin={chartMargin}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" fontSize={10} tick={axisTick} />
                <YAxis fontSize={10} tick={axisTick} unit=" d" />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                <Legend formatter={legendFormatter} />
                <Area type="monotone" dataKey="planned" name="Planned" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} />
                <Line type="monotone" dataKey="actual"  name="Actual"  stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: "#f59e0b" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Project Health" icon={CheckCircle} color="text-primary">
            <div className="space-y-3 pt-1">
              {[
                { label: "Budget",   val: costUsedPct,   color: costUsedPct   > 85 ? "#ef4444" : costUsedPct   > 65 ? "#f59e0b" : "#10b981" },
                { label: "Timeline", val: timeUsedPct,   color: timeUsedPct   > 85 ? "#ef4444" : timeUsedPct   > 65 ? "#f59e0b" : "#10b981" },
                { label: "Effort",   val: effortUsedPct, color: effortUsedPct > 85 ? "#ef4444" : effortUsedPct > 65 ? "#f59e0b" : "#10b981" },
                { label: "Risk",     val: analysis.risk_score || 0, color: (analysis.risk_score || 0) > 75 ? "#ef4444" : (analysis.risk_score || 0) > 50 ? "#f59e0b" : "#10b981" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold" style={{ color: item.color }}>{item.val}%</span>
                  </div>
                  <div className="w-full h-2 bg-accent rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, item.val)}%`, background: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      )}

      {/* Quality Metrics + Budget Gauge + Cost vs Benefit (full mode only) */}
      {mode === "full" && (
        <>
          <ChartCard title="Quality Metrics" icon={CheckCircle} color="text-emerald-500">
            <QualityMetricsCards
              qualityImpact={(analysis as any).quality_impact}
              securityImpact={(analysis as any).security_impact}
              maintainabilityImpact={(analysis as any).maintainability_impact}
            />
          </ChartCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Budget Utilization" icon={TrendingUp} color="text-amber-500">
              <BudgetGauge
                percentage={budgetUsedPct}
                usedAmount={format(convert(cost.new || 0, currency))}
                remainingAmount={format(convert(Math.max(0, (cost.original || 0) * 1.5 - (cost.new || 0)), currency))}
                totalAmount={format(convert((cost.original || 0) * 1.5, currency))}
              />
            </ChartCard>

            {costBenefitData.length > 0 && (
              <ChartCard title="Cost vs Benefit" icon={TrendingUp} color="text-violet-500">
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <ScatterChart margin={{ top: 12, right: 16, bottom: 20, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      type="number" dataKey="x" name="Cost"
                      fontSize={10} tick={axisTick}
                      tickFormatter={(v) => formatCompact(v)}
                      label={{ value: "Cost", position: "insideBottom", offset: -12, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      type="number" dataKey="y" name="Benefit"
                      fontSize={10} tick={axisTick}
                      tickFormatter={(v) => formatCompact(v)}
                      label={{ value: "Benefit", angle: -90, position: "insideLeft", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <ZAxis type="number" dataKey="z" range={[40, 200]} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ strokeDasharray: "3 3" }}
                      content={({ payload }) => {
                        if (!payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div style={tooltipStyle} className="p-3">
                            <p className="font-semibold text-sm mb-1">{d.name}</p>
                            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Cost: {formatCompact(d.x)}</p>
                            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Benefit: {formatCompact(d.y)}</p>
                            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Hours: {d.z}h</p>
                          </div>
                        );
                      }}
                    />
                    <Scatter data={costBenefitData} fill="#8b5cf6" fillOpacity={0.75} />
                  </ScatterChart>
                </ResponsiveContainer>
              </ChartCard>
            )}
          </div>
        </>
      )}

      {/* Affected Components table (full mode) */}
      {mode === "full" && components.length > 0 && (
        <div className="rounded-2xl border border-border bg-card/80 p-4 overflow-x-auto">
          <h3 className="font-semibold text-sm mb-3">Affected Components</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left py-2">Component</th>
                <th className="text-right py-2">Hours</th>
                <th className="text-left py-2 pl-3">Impact</th>
              </tr>
            </thead>
            <tbody>
              {components.map((c, i) => (
                <tr key={i} className="border-b border-border/40 hover:bg-accent/30 transition-colors">
                  <td className="py-2 font-medium">{c.name}</td>
                  <td className="py-2 text-right font-mono">{c.estimated_hours || 0}h</td>
                  <td className="py-2 pl-3">
                    <StatusBadge status={(c as any).impact_level?.toLowerCase() || "medium"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recommendations (full mode) */}
      {mode === "full" && recs.length > 0 && (
        <div className="rounded-2xl border border-border bg-card/80 p-4">
          <h3 className="font-semibold text-sm mb-2">Recommendations</h3>
          <ul className="space-y-1.5">
            {recs.map((r, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-primary font-bold shrink-0">{i + 1}.</span> {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BarChart3Icon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
    </svg>
  );
}
