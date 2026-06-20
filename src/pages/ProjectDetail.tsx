/**
 * ProjectDetail — Project-level aggregated analytics + per-requirement charts + CR drill-down
 */
import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { StatusBadge } from "@/components/common/StatusBadge";
import { toast } from "@/components/common/Toast";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { useCurrencyStore } from "@/stores/currencyStore";
import { useAuthStore } from "@/stores/authStore";
import { AnalysisChartsPanel } from "@/components/charts/AnalysisChartsPanel";
import { BudgetGauge } from "@/components/charts/BudgetGauge";
import { QualityMetricsCards } from "@/components/charts/QualityMetricsCards";
import { ViewportModal } from "@/components/common/ViewportModal";
import {
  Plus, Trash2, ChevronDown, ChevronRight, BarChart3,
  ExternalLink, Clock, Users, Zap, CheckCircle,
  FileText, TrendingUp, AlertTriangle, Activity,
} from "lucide-react";
import DiscussionThread from "@/components/discussions/DiscussionThread";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  AreaChart, Area, LineChart, Line, ComposedChart,
  ScatterChart, Scatter, ZAxis,
} from "recharts";
import {
  groupBy, toChartData, aggregateAnalyses,
  buildCostTrendFromAnalyses, buildRiskTrendFromAnalyses,
  buildBurndownFromAnalysis, type AnalysisLike,
} from "@/utils/analysisCharts";

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
const STATUS_COLORS: Record<string, string> = {
  submitted: "#6366f1", analyzed: "#8b5cf6", approved: "#10b981",
  rejected: "#ef4444", implemented: "#06b6d4", draft: "#94a3b8",
};
const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ef4444", high: "#f59e0b", medium: "#6366f1", low: "#10b981",
};
const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};

function ChartCard({ title, icon: Icon, color, children }: {
  title: string; icon: React.ComponentType<{ className?: string }>; color: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="font-semibold flex items-center gap-2 mb-4 text-sm">
        <Icon className={`h-4 w-4 ${color}`} />
        {title}
      </h3>
      {children}
    </div>
  );
}

function RequirementMiniCharts({ crs }: { crs: any[] }) {
  if (!crs.length) return null;
  const statusData = toChartData(groupBy(crs, "status"));
  const priorityData = toChartData(groupBy(crs, "priority"));
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-6 py-4 bg-accent/5 border-t border-border/30">
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">CR Status</p>
        <ResponsiveContainer width="100%" height={140}>
          <PieChart margin={{ top: 0, bottom: 0 }}>
            <Pie data={statusData} dataKey="value" cx="50%" cy="50%" outerRadius={48}
              labelLine={false} fontSize={9}>
              {statusData.map((entry, i) => (
                <Cell key={i} fill={STATUS_COLORS[entry.rawName] || PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: 9 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Priority</p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={priorityData} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" fontSize={9} allowDecimals={false} />
            <YAxis type="category" dataKey="name" fontSize={9} width={60} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {priorityData.map((entry, i) => (
                <Cell key={i} fill={PRIORITY_COLORS[entry.rawName] || PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { format, convert } = useCurrencyStore();

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allCRs, setAllCRs] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisLike[]>([]);
  const [analysisByCrId, setAnalysisByCrId] = useState<Record<number, AnalysisLike>>({});
  const [expandedReqs, setExpandedReqs] = useState<Set<number>>(new Set());
  const [expandedCrId, setExpandedCrId] = useState<number | null>(null);
  const [showAddReq, setShowAddReq] = useState(false);
  const [reqForm, setReqForm] = useState({
    title: "", description: "", complexity: "medium", priority: "medium",
  });

  const isClient = user?.role === "client";
  const canSubmitCR = isClient || user?.role === "project_manager" || user?.role === "admin";

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const proj = await api.getProject(parseInt(id)) as any;
      setProject(proj);

      const reqIds = new Set((proj.requirements || []).map((r: any) => r.id));
      const allFetched = await api.getChangeRequests({ project_id: parseInt(id) });
      const projectCRs = allFetched.filter((cr: any) => reqIds.has(cr.requirement_id));
      setAllCRs(projectCRs);

      const analyzedCRs = projectCRs.filter((cr: any) => cr.analysis_id);
      const pairs = await Promise.all(
        analyzedCRs.map(async (cr: any) => {
          const a = await api.getAnalysis(cr.analysis_id).catch(() => null) as AnalysisLike | null;
          return a ? { crId: cr.id, analysis: { ...a, change_description: cr.description } } : null;
        }),
      );
      const valid = pairs.filter(Boolean) as { crId: number; analysis: AnalysisLike }[];
      setAnalyses(valid.map((p) => p.analysis));
      const map: Record<number, AnalysisLike> = {};
      valid.forEach((p) => { map[p.crId] = p.analysis; });
      setAnalysisByCrId(map);

      setExpandedReqs(new Set((proj.requirements || []).map((r: any) => r.id)));
    } catch {
      toast.error("Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const aggregated = useMemo(() => aggregateAnalyses(analyses), [analyses]);

  const addReq = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createRequirement({ ...reqForm, project_id: parseInt(id!) });
      toast.success("Requirement added — submit a change request to see charts");
      setShowAddReq(false);
      setReqForm({ title: "", description: "", complexity: "medium", priority: "medium" });
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteReq = async (rid: number) => {
    if (!confirm("Delete this requirement and all its change requests?")) return;
    try {
      await api.deleteRequirement(rid);
      toast.success("Deleted");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleReq = (rid: number) => {
    setExpandedReqs((prev) => {
      const next = new Set(prev);
      next.has(rid) ? next.delete(rid) : next.add(rid);
      return next;
    });
  };

  const goSubmitCR = (requirementId?: number) => {
    const q = new URLSearchParams({ project_id: id! });
    if (requirementId) q.set("requirement_id", String(requirementId));
    navigate(`/new-analysis?${q.toString()}`);
  };

  if (loading) return <PageLoader />;
  if (!project) return <div className="py-20 text-center text-muted-foreground">Project not found</div>;

  const statusChartData = toChartData(groupBy(allCRs, "status"));
  const typeChartData = toChartData(groupBy(allCRs, "change_type"));
  const priorityChartData = toChartData(groupBy(allCRs, "priority"));
  const approvedCount = allCRs.filter((c) => c.status === "approved" || c.status === "implemented").length;
  const pendingCount = allCRs.filter((c) => c.status === "submitted" || c.status === "analyzed").length;
  const progressPct = allCRs.length > 0 ? Math.round((approvedCount / allCRs.length) * 100) : 0;
  const hasAnalysisCharts = analyses.length > 0;

  const costTrendData = buildCostTrendFromAnalyses(analyses, "description");
  const riskTrendData = buildRiskTrendFromAnalyses(analyses);
  const burndownData = buildBurndownFromAnalysis(aggregated);

  const totalSenior = analyses.reduce((s, a) => s + (a.effort_impact?.breakdown?.senior || 0), 0);
  const totalMid = analyses.reduce((s, a) => s + (a.effort_impact?.breakdown?.mid || 0), 0);
  const totalJunior = analyses.reduce((s, a) => s + (a.effort_impact?.breakdown?.junior || 0), 0);
  const effortPieData = [
    { name: "Senior", value: Math.round(totalSenior) },
    { name: "Mid-Level", value: Math.round(totalMid) },
    { name: "Junior", value: Math.round(totalJunior) },
  ].filter((e) => e.value > 0);

  const avgCostPct = analyses.reduce((s, a) => s + (a.cost_impact?.percentage || 0), 0) / Math.max(analyses.length, 1);
  const totalBudget = parseFloat(project.total_budget || project.budget || 0);
  const totalCostUsed = analyses.reduce((s, a) => s + (a.cost_impact?.new || 0), 0);
  const budgetUsedPct = totalBudget > 0
    ? Math.min(100, Math.round((totalCostUsed / totalBudget) * 100))
    : Math.min(100, Math.round(50 + avgCostPct));

  const scatterData = allCRs.map((cr, i) => {
    const complexityScore = cr.complexity === "very_high" ? 4 : cr.complexity === "high" ? 3 : cr.complexity === "medium" ? 2 : 1;
    const priorityScore = cr.priority === "critical" ? 4 : cr.priority === "high" ? 3 : cr.priority === "medium" ? 2 : 1;
    return { name: `CR ${i + 1}`, complexity: complexityScore, impact: priorityScore, z: 100 };
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{project.description || "No description provided"}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {project.priority && <StatusBadge status={project.priority} />}
          <StatusBadge status={project.status} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Team Size", value: `${project.team_size} members`, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
          { label: "Duration", value: `${project.initial_duration} days`, icon: Clock, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
          { label: "Stage", value: project.stage || "—", icon: Activity, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
          { label: "Cost/Day", value: format(convert(parseFloat(project.cost_per_day || 0), project.currency)), icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border ${s.border} bg-card p-4 hover:shadow-md transition-all`}>
            <div className={`h-9 w-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div className="text-base font-semibold capitalize">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Project Analytics — always visible */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Project Analytics</h2>
            <span className="text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded-full">
              {allCRs.length} CRs · {project.requirements?.length || 0} requirements
            </span>
          </div>
          {canSubmitCR && (
            <button
              onClick={() => goSubmitCR()}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              <Plus className="h-3.5 w-3.5" /> New Change Request
            </button>
          )}
        </div>

        {allCRs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground mb-4">
              No change requests yet. Submit one to unlock all project charts.
            </p>
            {canSubmitCR ? (
              <button onClick={() => goSubmitCR()} className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">
                Submit First Change Request
              </button>
            ) : (
              <p className="text-xs text-muted-foreground">Add a requirement below, then submit a change request to unlock charts.</p>
            )}
          </div>
        ) : (
          <>
            {/* Row 1: Progress + Status + Priority */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ChartCard title="Overall Progress" icon={CheckCircle} color="text-emerald-500">
                <div className="text-center mb-4">
                  <div className="text-5xl font-black text-primary">{progressPct}%</div>
                  <div className="text-xs text-muted-foreground mt-1">Requests Approved</div>
                </div>
                <div className="w-full h-3 bg-accent rounded-full overflow-hidden mb-4">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Total", val: allCRs.length, c: "text-foreground" },
                    { label: "Approved", val: approvedCount, c: "text-emerald-500" },
                    { label: "Pending", val: pendingCount, c: "text-amber-500" },
                  ].map((s) => (
                    <div key={s.label} className="text-center rounded-xl bg-accent/50 p-2">
                      <div className={`text-xl font-bold ${s.c}`}>{s.val}</div>
                      <div className="text-[10px] text-muted-foreground">{s.label}</div>
                    </div>
                  ))}
                </div>
              </ChartCard>

              <ChartCard title="Approval Status" icon={Activity} color="text-purple-500">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart margin={{ top: 0, bottom: 0 }}>
                    <Pie data={statusChartData} dataKey="value" cx="50%" cy="45%" outerRadius={65}
                      labelLine={false} fontSize={10}>
                      {statusChartData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.rawName] || PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Priority Breakdown" icon={AlertTriangle} color="text-amber-500">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={priorityChartData} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" fontSize={10} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" fontSize={10} width={72} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {priorityChartData.map((entry, i) => (
                        <Cell key={i} fill={PRIORITY_COLORS[entry.rawName] || PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Row 2: Type volume + Team workload */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Change Request Volume by Type" icon={BarChart3} color="text-blue-500">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={typeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {typeChartData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Team Workload Distribution" icon={Users} color="text-emerald-500">
                {effortPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart margin={{ top: 0, bottom: 0 }}>
                      <Pie data={effortPieData} dataKey="value" cx="50%" cy="45%"
                        innerRadius={45} outerRadius={72} labelLine={false} fontSize={10}>
                        {effortPieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [`${v} days`, name]} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                    <Users className="h-8 w-8 opacity-20" />
                    <p>Analyze change requests to see workload</p>
                  </div>
                )}
              </ChartCard>
            </div>

            {/* Aggregated analysis charts */}
            {hasAnalysisCharts && aggregated && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Combined Impact Across All Change Requests
                </h3>
                <AnalysisChartsPanel analysis={aggregated} mode="compact" showKpis={true} />
              </div>
            )}

            {hasAnalysisCharts && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Cost Trend Across CRs" icon={TrendingUp} color="text-indigo-500">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={costTrendData}>
                      <defs>
                        <linearGradient id="costGradPD" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="cr" fontSize={10} />
                      <YAxis fontSize={10} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [format(convert(v, project.currency)), ""]} />
                      <Area type="monotone" dataKey="cost" stroke="#6366f1" fill="url(#costGradPD)" strokeWidth={2} dot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Risk Trend Across CRs" icon={AlertTriangle} color="text-red-500">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={riskTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="cr" fontSize={10} />
                      <YAxis fontSize={10} domain={[0, 100]} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>
            )}

            {hasAnalysisCharts && burndownData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Timeline Burndown" icon={Activity} color="text-sky-500">
                  <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={burndownData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" fontSize={10} />
                      <YAxis fontSize={10} unit=" d" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Area type="monotone" dataKey="planned" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} />
                      <Line type="monotone" dataKey="actual" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Project Health Dashboard" icon={Zap} color="text-primary">
                  <div className="space-y-3">
                    {[
                      { label: "Budget Utilization", val: budgetUsedPct },
                      { label: "Timeline Impact", val: Math.min(100, Math.round(analyses.reduce((s, a) => s + (a.time_impact?.percentage || 0), 0) / analyses.length)) },
                      { label: "Completion Progress", val: progressPct },
                      { label: "Risk Exposure", val: Math.min(100, Math.round(analyses.reduce((s, a) => s + (a.risk_score || 0), 0) / analyses.length)) },
                    ].map((item) => {
                      const color = item.val > 85 ? "#ef4444" : item.val > 65 ? "#f59e0b" : "#10b981";
                      return (
                        <div key={item.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className="font-semibold" style={{ color }}>{item.val}%</span>
                          </div>
                          <div className="w-full h-2.5 bg-accent rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${item.val}%`, background: color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ChartCard>
              </div>
            )}

            {hasAnalysisCharts && (
              <ChartCard title="Quality Metrics" icon={CheckCircle} color="text-emerald-500">
                <QualityMetricsCards
                  qualityImpact={Math.round(analyses.reduce((s, a) => s + ((a as { quality_impact?: number }).quality_impact || a.risk_breakdown?.quality || 0), 0) / analyses.length)}
                  maintainabilityImpact={Math.round(analyses.reduce((s, a) => s + ((a as { maintainability_impact?: number }).maintainability_impact || 0), 0) / analyses.length)}
                />
              </ChartCard>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Budget Utilization" icon={TrendingUp} color="text-amber-500">
                <BudgetGauge
                  percentage={budgetUsedPct}
                  usedAmount={format(convert(totalCostUsed, project.currency))}
                  remainingAmount={format(convert(Math.max(0, totalBudget - totalCostUsed), project.currency))}
                  totalAmount={format(convert(totalBudget, project.currency))}
                />
              </ChartCard>

              <ChartCard title="Impact vs Complexity" icon={AlertTriangle} color="text-purple-500">
                <ResponsiveContainer width="100%" height={220}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" dataKey="complexity" ticks={[1, 2, 3, 4]} tickFormatter={(v) => v === 1 ? "Low" : v === 2 ? "Med" : v === 3 ? "High" : "V.High"} fontSize={10} />
                    <YAxis type="number" dataKey="impact" ticks={[1, 2, 3, 4]} fontSize={10} />
                    <ZAxis type="number" dataKey="z" range={[100, 150]} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Scatter data={scatterData} fill="#8b5cf6" fillOpacity={0.7} />
                  </ScatterChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </>
        )}
      </div>

      {/* Team */}
      {project.members?.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Team Members
          </h2>
          <div className="flex flex-wrap gap-2">
            {project.members.map((m: any) => (
              <div key={m.id} className="flex items-center gap-2 rounded-xl bg-accent/50 px-3 py-2">
                <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                  {m.full_name?.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium">{m.full_name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{m.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requirements */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Requirements ({project.requirements?.length || 0})
          </h2>
          {!isClient && (
            <button onClick={() => setShowAddReq(true)}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
              <Plus className="h-3.5 w-3.5" /> Add Requirement
            </button>
          )}
        </div>

        {!(project.requirements?.length) ? (
          <div className="p-10 text-center">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">No requirements yet.</p>
            {!isClient && (
              <button onClick={() => setShowAddReq(true)} className="mt-3 text-sm text-primary hover:underline">
                Add the first requirement →
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {project.requirements.map((req: any) => {
              const reqCRs = allCRs.filter((c) => c.requirement_id === req.id);
              const isOpen = expandedReqs.has(req.id);
              const reqAnalyses = reqCRs
                .filter((c) => analysisByCrId[c.id])
                .map((c) => analysisByCrId[c.id]);
              const reqAggregated = aggregateAnalyses(reqAnalyses);
              const reqApproved = reqCRs.filter((c) => c.status === "approved" || c.status === "implemented").length;
              const reqProgressPct = reqCRs.length > 0 ? Math.round((reqApproved / reqCRs.length) * 100) : 0;

              return (
                <div key={req.id}>
                  <div
                    className="flex items-center justify-between px-5 py-4 hover:bg-accent/20 transition-colors cursor-pointer group"
                    onClick={() => toggleReq(req.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isOpen ? <ChevronDown className="h-4 w-4 text-primary shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{req.title}</p>
                        {req.description && <p className="text-xs text-muted-foreground truncate max-w-md">{req.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                      <StatusBadge status={req.complexity} />
                      <StatusBadge status={req.priority} />
                      <span className="text-xs bg-accent/70 rounded-lg px-2 py-1">{reqCRs.length} CRs · {reqProgressPct}%</span>
                      {!isClient && (
                        <button onClick={() => deleteReq(req.id)} className="text-red-400 hover:bg-red-500/10 rounded-lg p-1.5">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-border/50 bg-accent/5">
                      {reqCRs.length > 0 && <RequirementMiniCharts crs={reqCRs} />}

                      {reqAggregated && (
                        <div className="px-6 py-5 border-t border-border/30">
                          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            Requirement Impact Analysis ({reqAnalyses.length} analyzed CRs)
                          </h4>
                          <AnalysisChartsPanel analysis={reqAggregated} mode="full" showKpis={true} />
                        </div>
                      )}

                      <div className="divide-y divide-border/40">
                        {reqCRs.length === 0 ? (
                          <div className="px-8 py-5 text-center">
                            <p className="text-xs text-muted-foreground">No change requests yet.</p>
                            {canSubmitCR && (
                              <button onClick={() => goSubmitCR(req.id)} className="mt-2 text-xs text-primary hover:underline">
                                Submit change request →
                              </button>
                            )}
                          </div>
                        ) : (
                          reqCRs.map((cr: any) => {
                            const crAnalysis = analysisByCrId[cr.id];
                            const isCrOpen = expandedCrId === cr.id;
                            return (
                              <div key={cr.id}>
                                <div
                                  className={`flex items-center justify-between px-6 py-3.5 cursor-pointer transition-colors ${isCrOpen ? "bg-primary/5" : "hover:bg-accent/30"}`}
                                  onClick={() => setExpandedCrId(isCrOpen ? null : cr.id)}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-2 w-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[cr.status] || "#94a3b8" }} />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate">{cr.description}</p>
                                      <p className="text-xs text-muted-foreground capitalize">
                                        {(cr.change_type || "").replace(/_/g, " ")}
                                        {cr.submitted_at && ` · ${new Date(cr.submitted_at).toLocaleDateString()}`}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <StatusBadge status={cr.status} />
                                    <StatusBadge status={cr.priority} />
                                    {cr.analysis_id && (
                                      <Link
                                        to={`/results/${cr.analysis_id}`}
                                        className="flex items-center gap-1 rounded-xl border border-primary/30 text-primary px-2.5 py-1 text-xs font-medium hover:bg-primary/10"
                                      >
                                        <ExternalLink className="h-3 w-3" /> Full Page
                                      </Link>
                                    )}
                                    {isCrOpen ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                  </div>
                                </div>

                                {isCrOpen && crAnalysis && (
                                  <div className="px-6 pb-6 pt-2 border-t border-border/30 bg-card/50">
                                    <AnalysisChartsPanel
                                      analysis={crAnalysis}
                                      mode="full"
                                      title={`Analysis: ${cr.description?.slice(0, 50)}`}
                                      showKpis={true}
                                    />
                                  </div>
                                )}
                                {isCrOpen && !crAnalysis && (
                                  <div className="px-6 py-4 text-sm text-muted-foreground border-t border-border/30">
                                    Awaiting analysis — submit or wait for processing.
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      {canSubmitCR && (
                        <div className="px-6 py-3 border-t border-border/30">
                          <button onClick={() => goSubmitCR(req.id)} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                            <Plus className="h-3 w-3" /> Add change request for this requirement
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ViewportModal open={showAddReq} onClose={() => setShowAddReq(false)} maxWidth="max-w-md" title="Add Requirement">
        <h2 className="text-lg font-bold mb-1">Add Requirement</h2>
        <p className="text-xs text-muted-foreground mb-5">Define a requirement to track change requests against.</p>
        <form onSubmit={addReq} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Title *</label>
            <input type="text" value={reqForm.title} onChange={(e) => setReqForm({ ...reqForm, title: e.target.value })} required
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
            <textarea value={reqForm.description} onChange={(e) => setReqForm({ ...reqForm, description: e.target.value })} rows={3}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Complexity</label>
              <select value={reqForm.complexity} onChange={(e) => setReqForm({ ...reqForm, complexity: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm">
                <option value="low">Low</option><option value="medium">Medium</option>
                <option value="high">High</option><option value="very_high">Very High</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
              <select value={reqForm.priority} onChange={(e) => setReqForm({ ...reqForm, priority: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm">
                <option value="low">Low</option><option value="medium">Medium</option>
                <option value="high">High</option><option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAddReq(false)} className="rounded-xl border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
            <button type="submit" className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">Add Requirement</button>
          </div>
        </form>
      </ViewportModal>

      <DiscussionThread entityType="project" entityId={parseInt(id!)} title="Project Discussion" />
    </div>
  );
}
