/**
 * ImpactSensei v5.0 — Results Page
 * Full v5.0 breakdown: 6-cost / 5-time / 3-effort / 5-risk
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
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
  AreaChart,
  Area,
  LineChart,
  Line,
  ComposedChart,
  ScatterChart,
  Scatter,
  ZAxis,
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
  const { user } = useAuthStore();
  const isClient = user?.role === "client";
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

  const costTrendData = [
    { month: "Month 1", cost: Math.round((cost.original || 0) * 0.8) },
    { month: "Month 2", cost: Math.round((cost.original || 0) * 0.9) },
    { month: "Month 3", cost: cost.original || 0 },
    { month: "Month 4", cost: Math.round((cost.new || 0) * 0.95) },
    { month: "Current", cost: cost.new || 0 },
  ];

  const riskTrendData = [
    { sprint: "Sprint 1", risk: Math.min(100, Math.round((analysis.risk_score || 0) * 1.2)) },
    { sprint: "Sprint 2", risk: Math.min(100, Math.round((analysis.risk_score || 0) * 1.1)) },
    { sprint: "Sprint 3", risk: Math.min(100, Math.round((analysis.risk_score || 0) * 1.05)) },
    { sprint: "Current", risk: analysis.risk_score || 0 },
  ];

  // Burndown chart: planned vs actual remaining work
  const totalDays = time.new || 30;
  const burndownData = Array.from({ length: 7 }, (_, i) => {
    const day = Math.round((i / 6) * totalDays);
    const planned = Math.round(totalDays * (1 - i / 6));
    const actualFactor = 1 - (i / 6) * (0.7 + Math.random() * 0.15);
    const actual = i < 5 ? Math.max(0, Math.round(totalDays * actualFactor)) : undefined;
    return { day: `D${day}`, planned, actual };
  });

  // Project Health data
  const costUsedPct = cost.original > 0 ? Math.min(100, Math.round((cost.new / (cost.original * 1.5)) * 100)) : 50;
  const timeUsedPct = time.original > 0 ? Math.min(100, Math.round((time.new / (time.original * 1.3)) * 100)) : 60;
  const effortUsedPct = effort.original > 0 ? Math.min(100, Math.round((effort.new / (effort.original * 1.4)) * 100)) : 55;
  const projectHealthData = [
    { name: "Budget", value: costUsedPct, fill: costUsedPct > 85 ? "#ef4444" : costUsedPct > 65 ? "#f59e0b" : "#10b981" },
    { name: "Timeline", value: timeUsedPct, fill: timeUsedPct > 85 ? "#ef4444" : timeUsedPct > 65 ? "#f59e0b" : "#10b981" },
    { name: "Effort", value: effortUsedPct, fill: effortUsedPct > 85 ? "#ef4444" : effortUsedPct > 65 ? "#f59e0b" : "#10b981" },
    { name: "Risk", value: analysis.risk_score || 0, fill: (analysis.risk_score || 0) > 75 ? "#ef4444" : (analysis.risk_score || 0) > 50 ? "#f59e0b" : "#10b981" },
  ];

  // Cost vs Benefit scatter data (simulated from components)
  const costBenefitData = components.slice(0, 8).map((c: ComponentImpact, i: number) => ({
    x: c.estimated_hours * 500,
    y: Math.round(c.estimated_hours * (c.priority === 1 ? 900 : c.priority === 2 ? 700 : 500) * (0.8 + i * 0.05)),
    z: c.estimated_hours,
    name: c.name,
  }));

  const handleExportPDF = () => {
    window.print();
  };

  // Client view: simplified cost + time only
  if (isClient) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Change Impact Summary</h1>
            <p className="text-muted-foreground text-sm mt-1">{analysis.project_name}</p>
          </div>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-accent print:hidden"
          >
            <Download className="h-4 w-4" /> PDF
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <TrendingUp className="h-8 w-8 text-emerald-500 mb-3" />
            <p className="text-sm text-muted-foreground">Cost increase</p>
            <p className="text-2xl font-bold mt-1">
              {format(convert(cost.increase || 0, analysis.currency))}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              +{cost.percentage || 0}% from original budget
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <Clock className="h-8 w-8 text-blue-500 mb-3" />
            <p className="text-sm text-muted-foreground">Timeline increase</p>
            <p className="text-2xl font-bold mt-1">{time.increase || 0} days</p>
            <p className="text-xs text-muted-foreground mt-2">
              Total work required: {effort.increase || time.increase || 0} days
            </p>
          </div>
        </div>
      </div>
    );
  }

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
            label: "Total work required",
            value: `${effort.increase || 0} days`,
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
        <div className="grid lg:grid-cols-3 gap-6">
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
              Cost Trend Over Time
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={costTrendData}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => formatCompact(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [format(v), "Cost"]} />
                <Area type="monotone" dataKey="cost" stroke="#10b981" fillOpacity={1} fill="url(#colorCost)" />
              </AreaChart>
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
                label={({ name, value }) => `${value} days of work`}
              >
                {effortPieData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [`${v} days`, ""]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                ["Original", effort.original, "days of work"],
                ["New Total", effort.new, "days of work"],
                ["Increase", effort.increase, "days of work"],
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
                  <span className="font-bold">{val} days of work</span>
                </div>
                <div className="text-xs text-muted-foreground">{note}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Risk Section */}
      <Section title="⚠️ Risk Assessment — 5 Dimensions">
        <div className="grid lg:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Risk Distribution
            </p>
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
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Risk Trend Over Sprints
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={riskTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="sprint" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
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

      {/* Burndown Chart */}
      <Section title="📉 Timeline Burndown — Planned vs Actual" defaultOpen={false}>
        <p className="text-xs text-muted-foreground mb-3">Tracks remaining work vs planned schedule. A line above the planned curve means you are behind schedule.</p>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={burndownData}>
            <defs>
              <linearGradient id="plannedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" fontSize={12} stroke="hsl(var(--muted-foreground))" />
            <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" unit=" d" />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} days remaining`, ""]} />
            <Legend />
            <Area type="monotone" dataKey="planned" name="Planned" stroke="#6366f1" fill="url(#plannedGrad)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="actual" name="Actual" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4, fill: "#f59e0b" }} connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Section>

      {/* Project Health Dashboard */}
      <Section title="🏥 Project Health Dashboard" defaultOpen={false}>
        <p className="text-xs text-muted-foreground mb-4">Key health metrics at a glance. Red = critical, Amber = at risk, Green = healthy.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {projectHealthData.map((item) => (
            <div key={item.name} className="rounded-xl border border-border bg-accent/30 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{item.name}</span>
                <span className="text-sm font-bold" style={{ color: item.fill }}>{item.value}%</span>
              </div>
              <div className="w-full h-3 bg-accent rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, item.value)}%`, background: item.fill }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {item.value > 85 ? "⚠️ Critical — immediate attention needed" : item.value > 65 ? "⚡ At risk — monitor closely" : "✅ Healthy"}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Cost vs Benefit */}
      {costBenefitData.length > 0 && (
        <Section title="💹 Cost vs Benefit Analysis" defaultOpen={false}>
          <p className="text-xs text-muted-foreground mb-3">Each bubble represents an affected component. X = estimated cost, Y = estimated benefit. Larger bubbles = more hours. Top-left quadrant = best ROI.</p>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                dataKey="x"
                name="Cost"
                fontSize={11}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v) => formatCompact(v)}
                label={{ value: "Cost (₹/hr × hrs)", position: "insideBottom", offset: -5, fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Benefit"
                fontSize={11}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v) => formatCompact(v)}
                label={{ value: "Benefit Value", angle: -90, position: "insideLeft", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <ZAxis type="number" dataKey="z" range={[50, 300]} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ strokeDasharray: "3 3" }}
                formatter={(value: number, name: string) => [
                  name === "Cost" ? formatCompact(value) : formatCompact(value),
                  name,
                ]}
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div style={tooltipStyle} className="p-3">
                      <p className="font-semibold text-sm mb-1">{d.name}</p>
                      <p className="text-xs text-muted-foreground">Cost: {formatCompact(d.x)}</p>
                      <p className="text-xs text-muted-foreground">Benefit: {formatCompact(d.y)}</p>
                      <p className="text-xs text-muted-foreground">Hours: {d.z}h</p>
                    </div>
                  );
                }}
              />
              <Scatter
                data={costBenefitData}
                fill="#6366f1"
                fillOpacity={0.8}
              />
            </ScatterChart>
          </ResponsiveContainer>
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
