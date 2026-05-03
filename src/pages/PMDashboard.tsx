/**
 * ImpactSensei v5.0 - PM Dashboard
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/services/api";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useAuthStore } from "@/stores/authStore";
import {
  CheckSquare,
  FolderKanban,
  Users,
  BarChart3,
  Clock,
  PlusCircle,
} from "lucide-react";

export default function PMDashboard() {
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getProjects(),
      api.getChangeRequests({ status: "submitted" }),
    ])
      .then(([p, cr]) => {
        setProjects(p);
        setPending(cr);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const active = projects.filter((p) => p.status === "active").length;

  const stats = [
    {
      label: "Total Projects",
      value: projects.length,
      icon: FolderKanban,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      label: "Active Projects",
      value: active,
      icon: BarChart3,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Pending Approvals",
      value: pending.length,
      icon: CheckSquare,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      alert: pending.length > 0,
    },
    {
      label: "Team Members",
      value: "—",
      icon: Users,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">PM Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.full_name?.split(" ")[0]}. Manage your team and
            projects.
          </p>
        </div>
        <Link
          to="/projects"
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
        >
          <PlusCircle className="h-4 w-4" /> New Project
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div
            key={i}
            className={`rounded-2xl border bg-card p-5 transition-all hover:shadow-lg ${s.alert ? "border-amber-500/30" : "border-border"}`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl mb-3 ${s.bg}`}
            >
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
            <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            {s.alert && (
              <span className="text-xs text-amber-500 font-medium">
                Needs attention
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Pending Approvals */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-semibold flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-amber-500" />
            Pending Approvals
            {pending.length > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                {pending.length}
              </span>
            )}
          </h2>
          <Link
            to="/pm/approvals"
            className="text-sm text-primary hover:underline"
          >
            View All →
          </Link>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Loading...
            </p>
          ) : pending.length === 0 ? (
            <div className="p-8 text-center">
              <CheckSquare className="h-10 w-10 mx-auto mb-2 text-emerald-500/50" />
              <p className="text-muted-foreground text-sm">
                No pending approvals 🎉
              </p>
            </div>
          ) : (
            pending.slice(0, 5).map((cr: unknown) => (
              <div
                key={cr.id}
                className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium line-clamp-1">
                    {cr.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    By {cr.submitter_name} · {cr.requirement_title}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={cr.priority} />
                  <StatusBadge status={cr.complexity} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Projects */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-semibold">Company Projects</h2>
          <Link to="/projects" className="text-sm text-primary hover:underline">
            View All →
          </Link>
        </div>
        <div className="divide-y divide-border">
          {projects.slice(0, 6).map((p: unknown) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors"
            >
              <div>
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  Team: {p.team_size} · {p.requirements_count} reqs · {p.stage}{" "}
                  stage
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={p.priority} />
                <StatusBadge status={p.status} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Approvals",
            path: "/pm/approvals",
            icon: CheckSquare,
            color: "text-amber-500",
          },
          {
            label: "Team",
            path: "/pm/team",
            icon: Users,
            color: "text-purple-500",
          },
          {
            label: "Templates",
            path: "/pm/templates",
            icon: FolderKanban,
            color: "text-blue-500",
          },
          {
            label: "Reports",
            path: "/reports",
            icon: BarChart3,
            color: "text-emerald-500",
          },
        ].map((l, i) => (
          <Link
            key={i}
            to={l.path}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            <l.icon className={`h-5 w-5 ${l.color}`} />
            <span className="text-sm font-medium">{l.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
