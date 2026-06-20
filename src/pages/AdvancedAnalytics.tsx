/**
 * AdvancedAnalytics — Predictions, Anomaly Detection & Usage Stats page.
 */
import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, BarChart3, Users, Zap } from "lucide-react";
import { api } from "@/services/api";

type Trend = "rising" | "falling" | "stable";

interface PredictionData {
  history: { week: number; avg_risk: number; date: string }[];
  forecast: {
    week: number;
    predicted_risk: number;
    confidence: number;
    date: string;
    trend: Trend;
  }[];
  trend: Trend;
  slope: number;
}

interface Anomaly {
  analysis_id: number;
  created_at: string;
  risk_level: string;
  severity: "critical" | "warning";
  anomalies: { type: string; value: number; z_score: number }[];
}

interface AnomalyData {
  anomalies: Anomaly[];
  total_analyzed: number;
  anomaly_rate: number;
}

interface UsageData {
  period: string;
  users: { total: number; active: number; retention_pct: number };
  activity: { analyses_run: number; projects: number; change_requests: number; comments: number };
}

const TREND_ICONS = {
  rising: <TrendingUp className="h-4 w-4 text-red-500" />,
  falling: <TrendingDown className="h-4 w-4 text-emerald-500" />,
  stable: <Minus className="h-4 w-4 text-blue-500" />,
};

const TREND_COLORS = {
  rising: "text-red-500",
  falling: "text-emerald-500",
  stable: "text-blue-500",
};

export default function AdvancedAnalytics() {
  const [predictions, setPredictions] = useState<PredictionData | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("month");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [p, a, u] = await Promise.allSettled([
          api.get("/analytics/predictions?weeks=6"),
          api.get("/analytics/anomalies"),
          api.get(`/analytics/usage?period=${period}`),
        ]);
        if (p.status === "fulfilled") setPredictions(p.value as PredictionData);
        if (a.status === "fulfilled") setAnomalies(a.value as AnomalyData);
        if (u.status === "fulfilled") setUsage(u.value as UsageData);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period]);

  const chartData = [
    ...(predictions?.history.map((h) => ({
      date: h.date,
      risk: h.avg_risk,
      type: "actual",
    })) || []),
    ...(predictions?.forecast.map((f) => ({
      date: f.date,
      forecast: f.predicted_risk,
      confidence: f.confidence,
      type: "forecast",
    })) || []),
  ];

  const trend = predictions?.trend || "stable";

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Advanced Analytics</h1>
          <p className="text-sm text-muted-foreground">Predictions · Anomaly Detection · Usage</p>
        </div>
        <div className="flex gap-2 rounded-xl border border-border p-1">
          {(["week", "month", "quarter"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1 text-sm capitalize transition-colors ${
                period === p ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Usage Stats */}
      {usage && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Users", value: usage.users.total, icon: <Users className="h-4 w-4" />, color: "text-blue-500" },
            { label: "Active Users", value: usage.users.active, icon: <Zap className="h-4 w-4" />, color: "text-emerald-500" },
            { label: "Analyses Run", value: usage.activity.analyses_run, icon: <BarChart3 className="h-4 w-4" />, color: "text-purple-500" },
            { label: "Retention", value: `${usage.users.retention_pct}%`, icon: <TrendingUp className="h-4 w-4" />, color: "text-amber-500" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-card p-4 space-y-2"
            >
              <div className={`flex items-center gap-2 ${stat.color}`}>
                {stat.icon}
                <span className="text-xs font-medium">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Risk Forecast Chart */}
      {predictions && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Risk Forecast (6-week)</h2>
              <p className="text-sm text-muted-foreground">
                Linear regression on historical risk scores
              </p>
            </div>
            <div className={`flex items-center gap-1.5 font-medium ${TREND_COLORS[trend]}`}>
              {TREND_ICONS[trend]}
              <span className="text-sm capitalize">{trend}</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
              />
              <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Critical", fill: "#ef4444", fontSize: 10 }} />
              <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "High", fill: "#f59e0b", fontSize: 10 }} />
              <Area type="monotone" dataKey="risk" name="Actual Risk" stroke="#6366f1" fill="url(#riskGrad)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="forecast" name="Forecast" stroke="#f59e0b" fill="url(#forecastGrad)" strokeWidth={2} strokeDasharray="6 3" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Anomaly Detection */}
      {anomalies && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Anomaly Detection</h2>
              <p className="text-sm text-muted-foreground">
                Z-score analysis across {anomalies.total_analyzed} analyses · {anomalies.anomaly_rate}% anomaly rate
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-red-500/10 px-3 py-1 text-sm text-red-500">
              <AlertTriangle className="h-4 w-4" />
              {anomalies.anomalies.length} anomalies
            </div>
          </div>

          {anomalies.anomalies.length === 0 ? (
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 text-center text-sm text-emerald-500">
              ✓ No anomalies detected — all metrics within normal range
            </div>
          ) : (
            <div className="space-y-2">
              {anomalies.anomalies.slice(0, 5).map((a) => (
                <div
                  key={a.analysis_id}
                  className={`rounded-xl border p-3 ${
                    a.severity === "critical"
                      ? "border-red-500/20 bg-red-500/5"
                      : "border-amber-500/20 bg-amber-500/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">Analysis #{a.analysis_id}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        a.severity === "critical"
                          ? "bg-red-500/20 text-red-500"
                          : "bg-amber-500/20 text-amber-600"
                      }`}
                    >
                      {a.severity}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {a.anomalies.map((x, i) => (
                      <span key={i} className="text-xs text-muted-foreground">
                        {x.type.replace("_", " ")}: {x.value.toFixed(1)} (z={x.z_score})
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
