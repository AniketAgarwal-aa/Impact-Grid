import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";
import { BarChart3, AlertTriangle, TrendingUp, Clock, Users, PieChart as PieIcon } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from "recharts";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ProgressBar } from "@/components/common/ProgressBar";

const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  fontSize: "12px",
};

export default function PMAnalytics() {
  const [slaData, setSlaData] = useState<unknown>(null);
  const [usage, setUsage] = useState<unknown>(null);
  const [projects, setProjects] = useState<unknown[]>([]);
  const [changeRequests, setChangeRequests] = useState<unknown[]>([]);
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
      setProjects(projs as unknown[]);
      setChangeRequests(crs as unknown[]);
    })
    .catch(err => {
      toast.error(err.message || "Failed to load analytics");
    })
    .finally(() => setLoading(false));
  }, []);

  // Approval Status Distribution
  const statusCounts: Record<string, number> = {};
  changeRequests.forEach((cr: unknown) => {
    const s = (cr as { status: string }).status || "unknown";
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });
  const approvalStatusData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  // Priority Distribution
  const priorityCounts: Record<string, number> = {};
  changeRequests.forEach((cr: unknown) => {
    const p = (cr as { priority: string }).priority || "unknown";
    priorityCounts[p] = (priorityCounts[p] || 0) + 1;
  });
  const priorityData = Object.entries(priorityCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  // Change Request Volume (by type)
  const typeCounts: Record<string, number> = {};
  changeRequests.forEach((cr: unknown) => {
    const t = (cr as { change_type: string }).change_type || "other";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  const crVolumeData = Object.entries(typeCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " "),
    value,
  }));

  // Project Health data
  const projectHealthData = projects.slice(0, 6).map((p: unknown) => ({
    name: (p as { name: string }).name?.length > 12
      ? (p as { name: string }).name.substring(0, 12) + "…"
      : (p as { name: string }).name,
    reqs: (p as { requirements_count: number }).requirements_count || 0,
    team: (p as { team_size: number }).team_size || 0,
  }));

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" /> Company Analytics
        </h1>
        <p className="text-sm text-muted-foreground">SLA monitoring, change request insights, and company-wide metrics.</p>
      </div>

      {/* SLA KPI Cards */}
      {slaData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border bg-card p-6 hover:shadow-lg transition-shadow">
            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1"><Clock className="h-4 w-4" /> Total Pending Approvals</div>
            <div className="text-3xl font-bold">{slaData.total_pending}</div>
          </div>
          <div className="rounded-2xl border border-red-500/30 bg-card p-6 hover:shadow-lg transition-shadow">
            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-red-500" /> Overdue (SLA Missed)</div>
            <div className="text-3xl font-bold text-red-500">{slaData.overdue_count}</div>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-card p-6 hover:shadow-lg transition-shadow">
            <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp className="h-4 w-4 text-emerald-500" /> SLA Compliance Rate</div>
            <div className="text-3xl font-bold text-emerald-500">{slaData.compliance_rate}%</div>
            <ProgressBar value={slaData.compliance_rate} className="mt-2" showValue={false} />
          </div>
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Approval Status Distribution */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <PieIcon className="h-5 w-5 text-purple-500" /> Approval Status Distribution
          </h3>
          {approvalStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart margin={{ top: 0, bottom: 0 }}>
                <Pie
                  data={approvalStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius={72}
                  labelLine={false}
                >
                  {approvalStatusData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No change requests yet</div>
          )}
        </div>

        {/* Change Request Volume by Type */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-blue-500" /> Change Request Volume by Type
          </h3>
          {crVolumeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={crVolumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {crVolumeData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No change requests yet</div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Distribution */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Change Request Priority Breakdown
          </h3>
          {priorityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={priorityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <YAxis type="category" dataKey="name" fontSize={11} stroke="hsl(var(--muted-foreground))" width={70} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {priorityData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
          )}
        </div>

        {/* Project Health: Requirements vs Team Size */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-emerald-500" /> Project Health (Requirements vs Team)
          </h3>
          {projectHealthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={projectHealthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="reqs" name="Requirements" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="team" name="Team Size" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No projects</div>
          )}
        </div>
      </div>

      {/* Active Users Trend */}
      {usage && (usage as { active_users_trend?: unknown[] }).active_users_trend && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" /> Active Users (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={(usage as { active_users_trend: unknown[] }).active_users_trend}>
              <defs>
                <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" fontSize={12} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="users" stroke="#6366f1" fillOpacity={1} fill="url(#usersGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* SLA Overdue/On-Time Details */}
      {slaData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" /> Overdue Approvals
            </h3>
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
              {slaData.overdue.length === 0 ? (
                <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 text-center text-sm text-emerald-600">
                  ✓ No overdue approvals. Great job!
                </div>
              ) : (
                slaData.overdue.map((item: unknown) => (
                  <div key={(item as { cr_id: number }).cr_id} className="p-3 rounded-xl border border-red-500/20 bg-red-500/5">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">CR #{(item as { cr_id: number }).cr_id}</span>
                      <span className="text-xs font-semibold text-red-500">{(item as { hours_elapsed: number }).hours_elapsed}h elapsed</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{(item as { description: string }).description}</p>
                    <div className="mt-2 flex gap-2">
                      <StatusBadge status={(item as { status: string }).status} />
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-muted text-muted-foreground">
                        {(item as { risk_level: string }).risk_level} Risk (SLA: {(item as { sla_hours: number }).sla_hours}h)
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-500" /> On-Time Approvals
            </h3>
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
              {slaData.on_time.length === 0 ? (
                <p className="text-sm text-muted-foreground">No on-time pending approvals.</p>
              ) : (
                slaData.on_time.map((item: unknown) => (
                  <div key={(item as { cr_id: number }).cr_id} className="p-3 rounded-xl border border-border bg-background">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">CR #{(item as { cr_id: number }).cr_id}</span>
                      <span className="text-xs font-semibold text-emerald-500">{(item as { hours_remaining: number }).hours_remaining}h remaining</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{(item as { description: string }).description}</p>
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
