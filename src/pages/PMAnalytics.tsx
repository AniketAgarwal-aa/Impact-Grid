import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";
import {
  BarChart3, AlertTriangle, TrendingUp, Clock, Users,
  PieChart as PieIcon, Activity, CheckCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ProgressBar } from "@/components/common/ProgressBar";

const STATUS_COLORS: Record<string, string> = {
  submitted: "#6366f1",
  analyzed:  "#8b5cf6",
  approved:  "#10b981",
  rejected:  "#ef4444",
  implemented: "#06b6d4",
  draft: "#94a3b8",
};
const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high:     "#f59e0b",
  medium:   "#6366f1",
  low:      "#10b981",
};
const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

/** Tooltip style that works in both light AND dark mode */
const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
  boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
};
const tooltipItemStyle = { color: "hsl(var(--foreground))" };
const tooltipLabelStyle = { color: "hsl(var(--muted-foreground))", fontWeight: 600 };

/** Reusable styled chart card */
function ChartCard({
  title,
  icon: Icon,
  iconColor,
  children,
  empty,
  emptyMsg = "No data yet",
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  children?: React.ReactNode;
  empty?: boolean;
  emptyMsg?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="font-semibold flex items-center gap-2 mb-4 text-sm">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        {title}
      </h3>
      {empty ? (
        <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
          <Icon className={`h-8 w-8 opacity-20 ${iconColor}`} />
          <p>{emptyMsg}</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export default function PMAnalytics() {
  const [slaData, setSlaData] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [changeRequests, setChangeRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getSLADashboard(),
      api.getUsageAnalytics(),
      api.getProjects(),
      api.getChangeRequests({}),
    ])
      .then(([sla, usg, projs, crs]) => {
        setSlaData(sla);
        setUsage(usg);
        setProjects(projs as any[]);
        setChangeRequests(crs as any[]);
      })
      .catch((err) => {
        toast.error(err.message || "Failed to load analytics");
      })
      .finally(() => setLoading(false));
  }, []);

  // ─── Derived data ────────────────────────────────────────
  const statusCounts: Record<string, number> = {};
  changeRequests.forEach((cr) => {
    const s = cr.status || "unknown";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });
  const approvalStatusData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    rawName: name,
  }));

  const priorityCounts: Record<string, number> = {};
  changeRequests.forEach((cr) => {
    const p = cr.priority || "unknown";
    priorityCounts[p] = (priorityCounts[p] || 0) + 1;
  });
  const priorityData = Object.entries(priorityCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    rawName: name,
  }));

  const typeCounts: Record<string, number> = {};
  changeRequests.forEach((cr) => {
    const t = cr.change_type || "other";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  const crVolumeData = Object.entries(typeCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " "),
    value,
  }));

  const projectHealthData = projects.slice(0, 6).map((p) => ({
    name: p.name?.length > 12 ? p.name.substring(0, 12) + "…" : p.name,
    reqs: p.requirements_count || 0,
    team: p.team_size || 0,
  }));

  // Summary KPIs
  const totalCRs = changeRequests.length;
  const approvedCRs = changeRequests.filter((c) => c.status === "approved" || c.status === "implemented").length;
  const pendingCRs = changeRequests.filter((c) => c.status === "submitted" || c.status === "analyzed").length;
  const approvalRate = totalCRs > 0 ? Math.round((approvedCRs / totalCRs) * 100) : 0;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" /> Company Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          SLA monitoring, change request insights, and company-wide metrics.
        </p>
      </div>

      {/* Summary KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total CRs",       value: totalCRs,       icon: BarChart3,    color: "text-indigo-500",  bg: "bg-indigo-500/10",  border: "border-indigo-500/20" },
          { label: "Approved",         value: approvedCRs,    icon: CheckCircle,  color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
          { label: "Pending Review",   value: pendingCRs,     icon: Clock,        color: "text-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
          { label: "Approval Rate",    value: `${approvalRate}%`, icon: TrendingUp, color: "text-blue-500",  bg: "bg-blue-500/10",    border: "border-blue-500/20" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border ${s.border} bg-card p-4 hover:shadow-md transition-all`}>
            <div className={`h-9 w-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* SLA KPI Cards */}
      {slaData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border bg-card p-6 hover:shadow-lg transition-shadow">
            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <Clock className="h-4 w-4" /> Total Pending Approvals
            </div>
            <div className="text-3xl font-bold">{slaData.total_pending}</div>
          </div>
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 hover:shadow-lg transition-shadow">
            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Overdue (SLA Missed)
            </div>
            <div className="text-3xl font-bold text-red-500">{slaData.overdue_count}</div>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 hover:shadow-lg transition-shadow">
            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-emerald-500" /> SLA Compliance Rate
            </div>
            <div className="text-3xl font-bold text-emerald-500">{slaData.compliance_rate}%</div>
            <ProgressBar value={slaData.compliance_rate} className="mt-2" showValue={false} />
          </div>
        </div>
      )}

      {/* ── Charts Row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Approval Status Distribution */}
        <ChartCard
          title="Approval Status Distribution"
          icon={PieIcon}
          iconColor="text-purple-500"
          empty={approvalStatusData.length === 0}
          emptyMsg="No change requests yet"
        >
          <ResponsiveContainer width="100%" height={240}>
            <PieChart margin={{ top: 0, bottom: 0 }}>
              <Pie
                data={approvalStatusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="44%"
                outerRadius={78}
                innerRadius={36}
                labelLine={false}
                paddingAngle={2}
              >
                {approvalStatusData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.rawName] || CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={tooltipItemStyle}
                labelStyle={tooltipLabelStyle}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span style={{ color: "hsl(var(--foreground))", fontSize: "12px" }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Change Request Volume by Type */}
        <ChartCard
          title="Change Request Volume by Type"
          icon={BarChart3}
          iconColor="text-blue-500"
          empty={crVolumeData.length === 0}
          emptyMsg="No change requests yet"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={crVolumeData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                fontSize={11}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--foreground))" }}
              />
              <YAxis
                fontSize={11}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--foreground))" }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={tooltipItemStyle}
                labelStyle={tooltipLabelStyle}
                cursor={{ fill: "hsl(var(--accent))", opacity: 0.5 }}
              />
              <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
                {crVolumeData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Charts Row 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Distribution */}
        <ChartCard
          title="Change Request Priority Breakdown"
          icon={AlertTriangle}
          iconColor="text-amber-500"
          empty={priorityData.length === 0}
          emptyMsg="No data"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={priorityData} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                fontSize={11}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--foreground))" }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                fontSize={11}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--foreground))" }}
                width={72}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={tooltipItemStyle}
                labelStyle={tooltipLabelStyle}
                cursor={{ fill: "hsl(var(--accent))", opacity: 0.5 }}
              />
              <Bar dataKey="value" name="Count" radius={[0, 6, 6, 0]}>
                {priorityData.map((entry, i) => (
                  <Cell key={i} fill={PRIORITY_COLORS[entry.rawName] || CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Project Health: Requirements vs Team Size */}
        <ChartCard
          title="Project Overview (Requirements vs Team)"
          icon={Users}
          iconColor="text-emerald-500"
          empty={projectHealthData.length === 0}
          emptyMsg="No projects"
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={projectHealthData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                fontSize={11}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--foreground))" }}
              />
              <YAxis
                fontSize={11}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--foreground))" }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={tooltipItemStyle}
                labelStyle={tooltipLabelStyle}
                cursor={{ fill: "hsl(var(--accent))", opacity: 0.5 }}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ color: "hsl(var(--foreground))", fontSize: "12px" }}>{value}</span>
                )}
              />
              <Bar dataKey="reqs" name="Requirements" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="team" name="Team Size" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Active Users Trend */}
      {usage && usage.active_users_trend && (
        <ChartCard title="Active Users (Last 30 Days)" icon={Activity} iconColor="text-primary">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={usage.active_users_trend} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                fontSize={11}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--foreground))" }}
              />
              <YAxis
                fontSize={11}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--foreground))" }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={tooltipItemStyle}
                labelStyle={tooltipLabelStyle}
              />
              <Area type="monotone" dataKey="users" name="Active Users" stroke="#6366f1" fillOpacity={1} fill="url(#usersGrad)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* SLA Overdue / On-Time Details */}
      {slaData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" /> Overdue Approvals
              {slaData.overdue?.length > 0 && (
                <span className="ml-auto text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                  {slaData.overdue.length}
                </span>
              )}
            </h3>
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {slaData.overdue?.length === 0 ? (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center text-sm text-emerald-600">
                  ✓ No overdue approvals. Great job!
                </div>
              ) : (
                slaData.overdue.map((item: any) => (
                  <div key={item.cr_id} className="p-3 rounded-xl border border-red-500/20 bg-card/80">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">CR #{item.cr_id}</span>
                      <span className="text-xs font-semibold text-red-500">{item.hours_elapsed}h elapsed</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      <StatusBadge status={item.status} />
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-muted text-muted-foreground">
                        {item.risk_level} Risk · SLA: {item.sla_hours}h
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" /> On-Time Approvals
              {slaData.on_time?.length > 0 && (
                <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {slaData.on_time.length}
                </span>
              )}
            </h3>
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {slaData.on_time?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No on-time pending approvals.</p>
              ) : (
                slaData.on_time.map((item: any) => (
                  <div key={item.cr_id} className="p-3 rounded-xl border border-emerald-500/20 bg-card/80">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">CR #{item.cr_id}</span>
                      <span className="text-xs font-semibold text-emerald-500">{item.hours_remaining}h remaining</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
