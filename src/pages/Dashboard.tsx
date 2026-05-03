/**
 * ImpactSensei - User Dashboard
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useCurrencyStore } from "@/stores/currencyStore";
import { api } from "@/services/api";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  BarChart3,
  FolderKanban,
  GitCompare,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export default function Dashboard() {
  const { user } = useAuthStore();
  const { format, convert, currency, fetchExchangeRate } = useCurrencyStore();
  const [projects, setProjects] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExchangeRate();
    Promise.all([api.getProjects(), api.getScenarios()])
      .then(([p, s]) => {
        setProjects(p);
        setScenarios(s);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Onboarding Tour
    const hasSeenTour = localStorage.getItem("impactsensei_tour_v5");
    if (!hasSeenTour) {
      setTimeout(() => {
        const driverObj = driver({
          showProgress: true,
          steps: [
            { popover: { title: 'Welcome to ImpactSensei v5.1', description: 'Let us show you around your new enterprise dashboard.' } },
            { element: '#tour-stats', popover: { title: 'Dashboard Stats', description: 'Quickly see your active projects and saved scenarios.' } },
            { element: '#tour-new-analysis', popover: { title: 'New Analysis', description: 'Start a new impact simulation here.' } },
          ]
        });
        driverObj.drive();
        localStorage.setItem("impactsensei_tour_v5", "true");
      }, 500);
    }
  }, []);

  const activeProjects = projects.filter((p) => p.status === "active").length;
  const totalScenarios = scenarios.length;

  const stats = [
    {
      label: "Active Projects",
      value: activeProjects,
      icon: FolderKanban,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Total Projects",
      value: projects.length,
      icon: BarChart3,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      label: "Saved Scenarios",
      value: totalScenarios,
      icon: GitCompare,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Quick Actions",
      value: "→",
      icon: PlusCircle,
      color: "text-primary",
      bg: "bg-primary/10",
      isLink: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {user?.full_name?.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your projects and activity.
          </p>
        </div>
        <Link
          id="tour-new-analysis"
          to="/new-analysis"
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
        >
          <PlusCircle className="h-4 w-4" /> New Analysis
        </Link>
      </div>

      {/* Stats Grid */}
      <div id="tour-stats" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card p-5 transition-all hover:shadow-lg hover:border-primary/20"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg}`}
              >
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold">
              {s.isLink ? (
                <Link
                  to="/new-analysis"
                  className="text-primary hover:underline"
                >
                  Run Analysis
                </Link>
              ) : (
                s.value
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Projects */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-lg font-semibold">Recent Projects</h2>
          <Link to="/projects" className="text-sm text-primary hover:underline">
            View All
          </Link>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading...
            </div>
          ) : projects.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground mb-3">
                No projects yet. Create your first project!
              </p>
              <Link
                to="/projects"
                className="text-primary hover:underline text-sm font-medium"
              >
                Create Project →
              </Link>
            </div>
          ) : (
            projects.slice(0, 5).map((p) => (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
              >
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Team: {p.team_size} · Stage: {p.stage} ·{" "}
                    {p.requirements_count} requirements
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {format(
                      convert(p.cost_per_day * p.initial_duration, p.currency),
                    )}
                  </span>
                  <StatusBadge status={p.status} />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Recent Scenarios */}
      {scenarios.length > 0 && (
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-5">
            <h2 className="text-lg font-semibold">Recent Scenarios</h2>
            <Link
              to="/scenarios"
              className="text-sm text-primary hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="divide-y divide-border">
            {scenarios.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {s.project_name}
                  </p>
                </div>
                {s.analysis_summary && (
                  <div className="flex items-center gap-3">
                    <StatusBadge status={s.analysis_summary.risk_level} />
                    <span className="text-sm font-medium">
                      {s.analysis_summary.change_size}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
