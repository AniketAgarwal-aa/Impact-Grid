import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Link } from "react-router-dom";
import {
  Shield,
  Users,
  FolderKanban,
  BarChart3,
  AlertTriangle,
  Settings,
} from "lucide-react";

export default function AdminDashboard() {
  const [data, setData] = useState<unknown>(null);
  useEffect(() => {
    api
      .getAdminOverview()
      .then(setData)
      .catch(() => {});
  }, []);

  const stats = data
    ? [
        {
          label: "Total Users",
          value: data.total_users,
          icon: Users,
          color: "text-blue-500",
          bg: "bg-blue-500/10",
        },
        {
          label: "Active Users",
          value: data.active_users,
          icon: Users,
          color: "text-emerald-500",
          bg: "bg-emerald-500/10",
        },
        {
          label: "Total Projects",
          value: data.total_projects,
          icon: FolderKanban,
          color: "text-purple-500",
          bg: "bg-purple-500/10",
        },
        {
          label: "Active Projects",
          value: data.active_projects,
          icon: BarChart3,
          color: "text-indigo-500",
          bg: "bg-indigo-500/10",
        },
        {
          label: "Total Analyses",
          value: data.total_analyses,
          icon: BarChart3,
          color: "text-cyan-500",
          bg: "bg-cyan-500/10",
        },
        {
          label: "Pending Requests",
          value: data.pending_requests,
          icon: AlertTriangle,
          color: "text-amber-500",
          bg: "bg-amber-500/10",
        },
        {
          label: "Recent Signups",
          value: data.recent_signups,
          icon: Users,
          color: "text-pink-500",
          bg: "bg-pink-500/10",
        },
        {
          label: "Change Requests",
          value: data.total_change_requests,
          icon: Settings,
          color: "text-orange-500",
          bg: "bg-orange-500/10",
        },
      ]
    : [];

  const quickLinks = [
    { label: "User Management", path: "/admin/users", icon: Users },
    { label: "System Settings", path: "/admin/settings", icon: Settings },
    { label: "Audit Logs", path: "/admin/audit", icon: Shield },
    { label: "Templates", path: "/admin/templates", icon: FolderKanban },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" /> Admin Dashboard
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-lg"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg} mb-3`}
            >
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {data?.users_by_role && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-3">Users by Role</h3>
          <div className="flex gap-4">
            {Object.entries(data.users_by_role).map(([role, count]) => (
              <div
                key={role}
                className="rounded-xl bg-accent/50 px-4 py-3 text-center"
              >
                <div className="text-lg font-bold">{count as number}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {role.replace("_", " ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickLinks.map((l, i) => (
          <Link
            key={i}
            to={l.path}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5"
          >
            <l.icon className="h-5 w-5 text-primary" />
            <span className="font-medium text-sm">{l.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
