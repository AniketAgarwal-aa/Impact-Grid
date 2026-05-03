import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";
import { BarChart3, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { StatusBadge } from "@/components/common/StatusBadge";

export default function PMAnalytics() {
  const [slaData, setSlaData] = useState<unknown>(null);
  const [usage, setUsage] = useState<unknown>(null);

  useEffect(() => {
    Promise.all([
      api.getSLADashboard(),
      api.getUsageAnalytics()
    ])
    .then(([sla, usg]) => {
      setSlaData(sla);
      setUsage(usg);
    })
    .catch(err => {
      toast.error(err.message || "Failed to load analytics");
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" /> Company Analytics
        </h1>
        <p className="text-sm text-muted-foreground">SLA monitoring, usage stats, and company-wide metrics.</p>
      </div>

      {slaData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="text-sm text-muted-foreground mb-1">Total Pending Approvals</div>
              <div className="text-3xl font-bold">{slaData.total_pending}</div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="text-sm text-muted-foreground mb-1">Overdue (SLA Missed)</div>
              <div className="text-3xl font-bold text-red-500">{slaData.overdue_count}</div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="text-sm text-muted-foreground mb-1">SLA Compliance Rate</div>
              <div className="text-3xl font-bold text-emerald-500">{slaData.compliance_rate}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" /> Overdue Approvals
              </h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {slaData.overdue.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No overdue approvals. Great job!</p>
                ) : (
                  slaData.overdue.map((item: unknown) => (
                    <div key={item.cr_id} className="p-3 rounded-xl border border-red-500/20 bg-red-500/5">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">CR #{item.cr_id}</span>
                        <span className="text-xs font-semibold text-red-500">{item.hours_elapsed}h elapsed</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                      <div className="mt-2 flex gap-2">
                        <StatusBadge status={item.status} />
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-muted text-muted-foreground">
                          {item.risk_level} Risk (SLA: {item.sla_hours}h)
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
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {slaData.on_time.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No on-time pending approvals.</p>
                ) : (
                  slaData.on_time.map((item: unknown) => (
                    <div key={item.cr_id} className="p-3 rounded-xl border border-border bg-background">
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
        </>
      )}

      {usage && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" /> Active Users (Last 30 Days)
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usage.active_users_trend || []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="date" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip contentStyle={{background: 'var(--card)', border: '1px solid var(--border)'}} />
                <Bar dataKey="users" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
