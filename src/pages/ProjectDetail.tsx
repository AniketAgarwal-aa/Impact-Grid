/**
 * ProjectDetail — Full project view with requirements, change requests, and health charts.
 */
import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { StatusBadge } from "@/components/common/StatusBadge";
import { toast } from "@/components/common/Toast";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { useCurrencyStore } from "@/stores/currencyStore";
import { useAuthStore } from "@/stores/authStore";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  BarChart3,
  ExternalLink,
  Clock,
  Users,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
} from "lucide-react";
import DiscussionThread from "@/components/discussions/DiscussionThread";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const STATUS_ICON: Record<string, JSX.Element> = {
  submitted: <Clock className="h-3.5 w-3.5 text-blue-400" />,
  analyzed: <BarChart3 className="h-3.5 w-3.5 text-purple-400" />,
  approved: <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />,
  rejected: <XCircle className="h-3.5 w-3.5 text-red-400" />,
  implemented: <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />,
  draft: <FileText className="h-3.5 w-3.5 text-muted-foreground" />,
};

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  fontSize: "12px",
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddReq, setShowAddReq] = useState(false);
  const [expandedReqs, setExpandedReqs] = useState<Set<number>>(new Set());
  const [reqCRs, setReqCRs] = useState<Record<number, any[]>>({});
  const [reqForm, setReqForm] = useState({
    title: "",
    description: "",
    complexity: "medium",
    priority: "medium",
  });
  const { format, convert } = useCurrencyStore();
  const isClient = user?.role === "client";

  const load = useCallback(() => {
    api
      .getProject(parseInt(id!))
      .then(setProject)
      .catch(() => toast.error("Failed to load project"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  // Auto-expand all requirements and load their CRs
  useEffect(() => {
    if (!project?.requirements?.length) return;
    const ids = new Set<number>(project.requirements.map((r: any) => r.id));
    setExpandedReqs(ids);
    // Load CRs for each requirement via the general CR list filtered by requirement
    project.requirements.forEach((req: any) => {
      api
        .getChangeRequests({})
        .then((allCRs: any[]) => {
          const filtered = allCRs.filter((cr: any) => cr.requirement_id === req.id);
          setReqCRs((prev) => ({ ...prev, [req.id]: filtered }));
        })
        .catch(() => {});
    });
  }, [project]);

  const addReq = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createRequirement({ ...reqForm, project_id: parseInt(id!) });
      toast.success("Requirement added");
      setShowAddReq(false);
      setReqForm({ title: "", description: "", complexity: "medium", priority: "medium" });
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteReq = async (rid: number) => {
    if (!confirm("Delete this requirement?")) return;
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

  if (loading) return <PageLoader />;
  if (!project)
    return (
      <div className="py-12 text-center text-muted-foreground">Project not found</div>
    );

  // Aggregate all CRs for charts
  const allCRs: any[] = Object.values(reqCRs).flat();
  const statusCounts: Record<string, number> = {};
  allCRs.forEach((cr) => {
    statusCounts[cr.status] = (statusCounts[cr.status] || 0) + 1;
  });
  const statusPieData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));
  const priorityCounts: Record<string, number> = {};
  allCRs.forEach((cr) => {
    priorityCounts[cr.priority] = (priorityCounts[cr.priority] || 0) + 1;
  });
  const priorityBarData = Object.entries(priorityCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  const approvedCount = allCRs.filter((c) => c.status === "approved").length;
  const progressPct = allCRs.length > 0 ? Math.round((approvedCount / allCRs.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {project.description || "No description provided"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={project.priority} />
          <StatusBadge status={project.status} />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Team Size", value: `${project.team_size} members`, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Duration", value: `${project.initial_duration} days`, icon: Clock, color: "text-purple-500", bg: "bg-purple-500/10" },
          { label: "Stage", value: project.stage, icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Cost/Day", value: format(convert(parseFloat(project.cost_per_day || 0), project.currency)), icon: BarChart3, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
            <div className={`h-9 w-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`h-4.5 w-4.5 ${s.color}`} />
            </div>
            <div className="text-sm font-semibold capitalize">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Project Health & Charts */}
      {allCRs.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-primary" /> Project Analytics
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Progress */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Overall Progress</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold">{progressPct}%</span>
                <span className="text-sm text-muted-foreground mb-1">approved</span>
              </div>
              <div className="w-full h-3 bg-accent rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPct}%`,
                    background: progressPct > 75 ? "#10b981" : progressPct > 40 ? "#f59e0b" : "#6366f1",
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-1 mt-2">
                {[
                  { label: "Total", val: allCRs.length, color: "text-foreground" },
                  { label: "Approved", val: approvedCount, color: "text-emerald-500" },
                  { label: "Pending", val: allCRs.filter(c => c.status === "submitted" || c.status === "analyzed").length, color: "text-amber-500" },
                ].map((s) => (
                  <div key={s.label} className="text-center p-2 rounded-xl bg-accent/40">
                    <div className={`text-lg font-bold ${s.color}`}>{s.val}</div>
                    <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Pie */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">CR Status</p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={statusPieData} dataKey="value" cx="50%" cy="50%" outerRadius={65} label={({ name, value }) => `${name} (${value})`} labelLine={false} fontSize={10}>
                    {statusPieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Priority Bar */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">CR Priority</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={priorityBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {priorityBarData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Team Members */}
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

      {/* Requirements + Change Requests */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Requirements ({project.requirements?.length || 0})
          </h2>
          {!isClient && (
            <button
              onClick={() => setShowAddReq(true)}
              className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              <Plus className="h-3.5 w-3.5" /> Add Requirement
            </button>
          )}
        </div>

        {(project.requirements || []).length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No requirements yet.</p>
            {!isClient && (
              <button
                onClick={() => setShowAddReq(true)}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Add the first requirement →
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {project.requirements.map((req: any) => {
              const crs = reqCRs[req.id] || [];
              const isOpen = expandedReqs.has(req.id);
              return (
                <div key={req.id}>
                  {/* Requirement Row */}
                  <div
                    className="flex items-center justify-between px-5 py-4 hover:bg-accent/20 transition-colors cursor-pointer"
                    onClick={() => toggleReq(req.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{req.title}</p>
                        {req.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{req.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                      <StatusBadge status={req.complexity} />
                      <StatusBadge status={req.priority} />
                      <span className="text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded-lg">
                        {crs.length} CR{crs.length !== 1 ? "s" : ""}
                      </span>
                      {!isClient && (
                        <button
                          onClick={() => deleteReq(req.id)}
                          className="text-red-400 hover:bg-red-500/10 rounded-lg p-1.5 transition-colors"
                          title="Delete requirement"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Change Requests under this requirement */}
                  {isOpen && (
                    <div className="bg-accent/10 border-t border-border/50">
                      {crs.length === 0 ? (
                        <div className="px-8 py-4 text-center">
                          <p className="text-xs text-muted-foreground">No change requests for this requirement.</p>
                          {isClient && (
                            <button
                              onClick={() => navigate("/new-analysis")}
                              className="mt-2 text-xs text-primary hover:underline"
                            >
                              Submit a change request →
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="divide-y divide-border/50">
                          {crs.map((cr: any) => (
                            <div
                              key={cr.id}
                              className="flex items-center justify-between px-8 py-3 hover:bg-accent/30 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="shrink-0">{STATUS_ICON[cr.status] || STATUS_ICON.draft}</span>
                                <div className="min-w-0">
                                  <p className="text-sm truncate">{cr.description}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-muted-foreground capitalize">
                                      {cr.change_type?.replace(/_/g, " ")}
                                    </span>
                                    {cr.submitter_name && (
                                      <span className="text-xs text-muted-foreground">· by {cr.submitter_name}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-3">
                                <StatusBadge status={cr.status} />
                                <StatusBadge status={cr.priority} />
                                {cr.analysis_id ? (
                                  <Link
                                    to={`/results/${cr.analysis_id}`}
                                    className="flex items-center gap-1 rounded-lg bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold hover:bg-primary/20 transition-colors"
                                  >
                                    <BarChart3 className="h-3 w-3" />
                                    View Analysis
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                ) : cr.status === "draft" || cr.status === "submitted" ? (
                                  <span className="text-xs text-muted-foreground px-2 py-1 rounded-lg bg-accent">
                                    Awaiting analysis
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {isClient && (
                        <div className="px-8 py-2 border-t border-border/40">
                          <button
                            onClick={() => navigate("/new-analysis")}
                            className="flex items-center gap-1 text-xs text-primary hover:underline py-1"
                          >
                            <Plus className="h-3 w-3" /> Add change request
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

      {/* Add Requirement Modal */}
      {showAddReq && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowAddReq(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-1">Add Requirement</h2>
            <p className="text-xs text-muted-foreground mb-4">Define a new project requirement.</p>
            <form onSubmit={addReq} className="space-y-4">
              <input
                type="text"
                value={reqForm.title}
                onChange={(e) => setReqForm({ ...reqForm, title: e.target.value })}
                required
                placeholder="Requirement title"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
              />
              <textarea
                value={reqForm.description}
                onChange={(e) => setReqForm({ ...reqForm, description: e.target.value })}
                rows={2}
                placeholder="Description (optional)"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none resize-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Complexity</label>
                  <select
                    value={reqForm.complexity}
                    onChange={(e) => setReqForm({ ...reqForm, complexity: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="very_high">Very High</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
                  <select
                    value={reqForm.priority}
                    onChange={(e) => setReqForm({ ...reqForm, priority: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddReq(false)}
                  className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DiscussionThread
        entityType="project"
        entityId={parseInt(id!)}
        title="Project Discussion"
      />
    </div>
  );
}
