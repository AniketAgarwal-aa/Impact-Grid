/**
 * ImpactSensei v5.0 — Results Page
 * Full v5.0 breakdown: 6-cost / 5-time / 3-effort / 5-risk
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { useCurrencyStore } from "@/stores/currencyStore";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ProgressBar } from "@/components/common/ProgressBar";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { toast } from "@/components/common/Toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Download,
  Save,
  Zap,
  TrendingUp,
  Clock,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const CHART_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
];
const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  fontSize: "12px",
};

interface ComponentImpact {
  name: string;
  type: string;
  impact_level: string;
  estimated_hours: number;
  priority?: number;
}

interface AnalysisResult {
  project_id: number;
  project_name: string;
  calculation_version: string;
  confidence_score: number;
  change_size: string;
  risk_level: string;
  change_type?: string;
  cost_impact: {
    original: number;
    new: number;
    increase: number;
    percentage: number;
    breakdown: Record<string, number>;
  };
  time_impact: {
    original: number;
    new: number;
    increase: number;
    percentage: number;
    breakdown: Record<string, number>;
  };
  effort_impact: {
    original: number;
    new: number;
    increase: number;
    percentage: number;
    breakdown: Record<string, number>;
  };
  risk_breakdown: Record<string, number>;
  affected_components: ComponentImpact[];
  recommendations: string[];
  dependency_chain: string;
  currency: string;
  risk_score: number;
  quality_impact: number;
  performance_impact: number;
  security_impact: number;
  maintainability_impact: number;
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-5 hover:bg-accent/30 transition-colors"
      >
        <h3 className="font-semibold">{title}</h3>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSave, setShowSave] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const navigate = useNavigate();
  const { format, convert, formatCompact } = useCurrencyStore();

  useEffect(() => {
    if (!id) return;
    api
      .getAnalysis(parseInt(id))
      .then(setAnalysis)
      .catch(() => toast.error("Failed to load analysis"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader />;
  if (!analysis)
    return (
      <div className="py-12 text-center text-muted-foreground">
        Analysis not found
      </div>
    );

  const cost = analysis.cost_impact || {};
  const time = analysis.time_impact || {};
  const effort = analysis.effort_impact || {};
  const riskBd = analysis.risk_breakdown || {};
  const costBd = cost.breakdown || {};
  const timeBd = time.breakdown || {};
  const effortBd = effort.breakdown || {};
  const components = analysis.affected_components || [];
  const recs = analysis.recommendations || [];
  const chain = analysis.dependency_chain || "";

  // Chart data
  const costCompareData = [
    { name: "Original", value: convert(cost.original, analysis.currency) },
    { name: "New Total", value: convert(cost.new, analysis.currency) },
  ];
  const costBreakdownData = Object.entries(costBd).map(([k, v]) => ({
    name: k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, " "),
    value: convert(v as number, analysis.currency),
  }));
  const timeBreakdownData = Object.entries(timeBd).map(([k, v]) => ({
    name: k.charAt(0).toUpperCase() + k.slice(1),
    value: v as number,
  }));
  const effortPieData = [
    { name: "Senior (30%)", value: effortBd.senior || 0 },
    { name: "Mid-level (50%)", value: effortBd.mid || 0 },
    { name: "Junior (20%)", value: effortBd.junior || 0 },
  ];
  const radarData = [
    { subject: "Schedule", A: riskBd.schedule || 0 },
    { subject: "Budget", A: riskBd.budget || 0 },
    { subject: "Quality", A: riskBd.quality || 0 },
    { subject: "Security", A: riskBd.security || 0 },
    { subject: "Technical", A: riskBd.technical || 0 },
  ];

  const handleExportPDF = () => {
    // Browser print → “Save as PDF”
    window.print();
  };

  const handleSave = async () => {
    if (!scenarioName.trim()) {
      toast.error("Enter a scenario name");
      return;
    }
    try {
      await api.createScenario({
        project_id: analysis.project_id,
        name: scenarioName,
        analysis_id: parseInt(id!),
        is_baseline: false,
      });
      toast.success("Scenario saved!");
      setShowSave(false);
    } catch {
      toast.error("Save failed");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Impact Analysis Results</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {analysis.project_name} · v{analysis.calculation_version} Calculator
            · Confidence:{" "}
            <span className="text-primary font-semibold">
              {analysis.confidence_score}%
            </span>
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <StatusBadge
              status={
                analysis.change_size?.toLowerCase() === "small"
                  ? "low"
                  : analysis.change_size?.toLowerCase() === "medium"
                    ? "medium"
                    : analysis.change_size?.toLowerCase() === "large"
                      ? "high"
                      : "critical"
              }
            />
            <StatusBadge status={analysis.risk_level} />
            {analysis.change_type && (
              <StatusBadge status={analysis.change_type} />
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-accent transition-colors"
          >
            <Download className="h-4 w-4" /> PDF
          </button>
          <button
            onClick={() => setShowSave(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            <Save className="h-4 w-4" /> Save Scenario
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Cost Increase",
            value: formatCompact(
              convert(cost.increase || 0, analysis.currency),
            ),
            pct: `+${cost.percentage || 0}%`,
            icon: TrendingUp,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
          },
          {
            label: "Time Increase",
            value: `+${time.increase || 0} days`,
            pct: `+${time.percentage || 0}%`,
            icon: Clock,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
          },
          {
            label: "Effort Increase",
            value: `+${effort.increase || 0} days of work`,
            pct: `+${effort.percentage || 0}%`,
            icon: Users,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
          },
          {
            label: "Risk Score",
            value: `${analysis.risk_score || 0}/100`,
            pct: (analysis.risk_level || "").toUpperCase(),
            icon: AlertTriangle,
            color: "text-red-500",
            bg: "bg-red-500/10",
          },
        ].map((m, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card p-5 hover:shadow-lg transition-shadow"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl mb-3 ${m.bg}`}
            >
              <m.icon className={`h-5 w-5 ${m.color}`} />
            </div>
            <div className="text-xl font-bold">{m.value}</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">{m.label}</span>
              <span className={`text-xs font-bold ${m.color}`}>{m.pct}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Cost Section */}
      <Section title="💰 Cost Analysis — 6 Component Breakdown">
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Before vs After comparison
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={costCompareData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="name"
                  fontSize={12}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  fontSize={11}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => formatCompact(v)}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [format(v), "Amount"]}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Cost component breakdown
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={costBreakdownData} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  type="number"
                  fontSize={11}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => formatCompact(v)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  fontSize={11}
                  stroke="hsl(var(--muted-foreground))"
                  width={90}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [format(v), ""]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {costBreakdownData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(costBd).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-accent/50 p-3">
              <div className="text-xs text-muted-foreground capitalize mb-1">
                {k.replace(/_/g, " ")}
              </div>
              <div className="font-semibold text-sm">
                {format(convert(v as number, analysis.currency))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Time Section */}
      <Section title="⏱️ Time Analysis — 5 Phase Breakdown">
        <div className="grid lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={timeBreakdownData} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                type="number"
                fontSize={11}
                stroke="hsl(var(--muted-foreground))"
                unit=" d"
              />
              <YAxis
                type="category"
                dataKey="name"
                fontSize={11}
                stroke="hsl(var(--muted-foreground))"
                width={85}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [`${v} days`, ""]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {timeBreakdownData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                ["Original", time.original, "days"],
                ["New Total", time.new, "days"],
                ["Increase", time.increase, "days"],
              ].map(([l, v, u]) => (
                <div key={l as string} className="rounded-xl bg-accent/50 p-3">
                  <div className="text-xs text-muted-foreground">{l}</div>
                  <div className="text-lg font-bold">{v}</div>
                  <div className="text-xs text-muted-foreground">{u}</div>
                </div>
              ))}
            </div>
            {Object.entries(timeBd).map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between rounded-xl bg-accent/30 px-4 py-2"
              >
                <span className="text-sm capitalize">
                  {k.replace(/_/g, " ")}
                </span>
                <span className="font-semibold text-sm">
                  {v as number} days
                </span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Effort Section */}
      <Section title="👥 Effort Analysis — 3 Seniority Levels">
        <div className="grid lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={effortPieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, value }) => `${value}pd`}
              >
                {effortPieData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [`${v} person-days`, ""]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                ["Original", effort.original, "pd"],
                ["New Total", effort.new, "pd"],
                ["Increase", effort.increase, "pd"],
              ].map(([l, v, u]) => (
                <div key={l as string} className="rounded-xl bg-accent/50 p-3">
                  <div className="text-xs text-muted-foreground">{l}</div>
                  <div className="text-lg font-bold">{v}</div>
                  <div className="text-xs text-muted-foreground">{u}</div>
                </div>
              ))}
            </div>
            {[
              ["Senior Developers", effortBd.senior, "30% allocation"],
              ["Mid-level Developers", effortBd.mid, "50% allocation"],
              ["Junior Developers", effortBd.junior, "20% allocation"],
            ].map(([label, val, note]) => (
              <div
                key={label as string}
                className="rounded-xl bg-accent/30 px-4 py-3"
              >
                <div className="flex justify-between text-sm mb-1">
                  <span>{label}</span>
                  <span className="font-bold">{val} pd</span>
                </div>
                <div className="text-xs text-muted-foreground">{note}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Risk Section */}
      <Section title="⚠️ Risk Assessment — 5 Dimensions">
        <div className="grid lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="subject"
                fontSize={12}
                stroke="hsl(var(--muted-foreground))"
              />
              <PolarRadiusAxis domain={[0, 100]} tick={false} />
              <Radar
                name="Risk"
                dataKey="A"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.25}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
          <div className="space-y-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-3xl font-bold">
                {analysis.risk_score}/100
              </div>
              <StatusBadge status={analysis.risk_level} />
            </div>
            {[
              ["Schedule", riskBd.schedule],
              ["Budget", riskBd.budget],
              ["Quality", riskBd.quality],
              ["Security", riskBd.security],
              ["Technical", riskBd.technical],
            ].map(([label, val]) => (
              <ProgressBar
                key={label as string}
                label={label as string}
                value={val as number}
                showValue
                colorByValue
              />
            ))}
          </div>
        </div>
      </Section>

      {/* Quality Impacts */}
      <Section title="📊 Quality & Performance Impacts" defaultOpen={false}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            ["Quality", analysis.quality_impact],
            ["Performance", analysis.performance_impact],
            ["Security", analysis.security_impact],
            ["Maintainability", analysis.maintainability_impact],
          ].map(([l, v]) => (
            <div
              key={l as string}
              className="rounded-xl bg-accent/50 p-4 text-center"
            >
              <div className="text-2xl font-bold">{v || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {l} Impact Score
              </div>
              <ProgressBar
                value={v as number}
                showValue={false}
                className="mt-2"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Affected Components */}
      {components.length > 0 && (
        <Section title="🔧 Affected Components">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase">
                    Component
                  </th>
                  <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase">
                    Type
                  </th>
                  <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase">
                    Impact
                  </th>
                  <th className="text-right py-2 text-xs font-medium text-muted-foreground uppercase">
                    Hours
                  </th>
                  <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase pl-4">
                    Priority
                  </th>
                </tr>
              </thead>
              <tbody>
                {components.map((c: ComponentImpact, i: number) => (
                  <tr
                    key={i}
                    className="border-b border-border/50 hover:bg-accent/30"
                  >
                    <td className="py-3 font-medium text-card-foreground">
                      {c.name}
                    </td>
                    <td className="py-3 text-muted-foreground">{c.type}</td>
                    <td className="py-3">
                      <StatusBadge status={c.impact_level?.toLowerCase()} />
                    </td>
                    <td className="py-3 text-right font-mono">
                      {c.estimated_hours}h
                    </td>
                    <td className="py-3 pl-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{c.priority || 1}</span>
                        <div className="w-16 h-1.5 bg-accent rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${c.priority === 1 ? "bg-red-500 w-full" : c.priority === 2 ? "bg-orange-500 w-2/3" : "bg-yellow-500 w-1/3"}`}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td colSpan={3} className="py-3 font-medium">
                    Total Estimated Hours
                  </td>
                  <td className="py-3 text-right font-bold">
                    {components.reduce(
                      (sum: number, c: ComponentImpact) =>
                        sum + (c.estimated_hours || 0),
                      0,
                    )}
                    h
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Section>
      )}

      {/* Dependency Chain */}
      {chain && (
        <Section title="🔗 Dependency Chain" defaultOpen={false}>
          <div className="flex flex-wrap items-center gap-2">
            {chain.split(" → ").map((m: string, i: number, arr: string[]) => (
              <div key={i} className="flex items-center gap-2">
                <span className="rounded-xl bg-primary/10 px-4 py-2 text-sm font-medium text-primary capitalize">
                  {m}
                </span>
                {i < arr.length - 1 && (
                  <span className="text-muted-foreground font-bold">→</span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Recommendations */}
      <Section title="💡 Recommendations">
        <div className="space-y-2">
          {recs.map((r: string, i: number) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl bg-accent/50 p-3"
            >
              <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm">{r}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Save Modal */}
      {showSave && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowSave(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">Save as Scenario</h2>
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="Scenario name..."
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSave(false)}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
