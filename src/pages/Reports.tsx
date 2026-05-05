import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";
import { FileBarChart, Download, CalendarClock, Plus } from "lucide-react";
import { useCurrencyStore } from "@/stores/currencyStore";

export default function Reports() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [report, setReport] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const { format, convert } = useCurrencyStore();
  
  const [scheduledReports, setScheduledReports] = useState<any[]>([]);

  useEffect(() => {
    api.getProjects().then(setProjects).catch(() => {});
    api.getScheduledReports().then(setScheduledReports).catch(() => {});
  }, []);

  const loadReport = async (pid: number) => {
    setSelectedProject(pid);
    setLoading(true);
    try {
      const r = await api.getProjectReport(pid);
      setReport(r);
    } catch (err: unknown) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <FileBarChart className="h-6 w-6 text-primary" /> Reports & Exports
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-3">Select a Project</h3>
            <div className="grid grid-cols-2 gap-2">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => loadReport(p.id)}
                  className={`rounded-xl border p-3 text-left text-sm transition-all ${selectedProject === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                >
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.requirements_count} reqs
                  </div>
                </button>
              ))}
            </div>
          </div>

          {loading && <p className="text-center text-muted-foreground py-8">Loading report data...</p>}

          {report && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h2 className="text-lg font-semibold">
                  Report: {report.project.name}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={exportPDF}
                    className="flex items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-sm hover:bg-accent"
                  >
                    <Download className="h-4 w-4" /> PDF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  ["Requirements", report.summary.total_requirements],
                  ["Change Requests", report.summary.total_change_requests],
                  ["Analyses", report.summary.total_analyses],
                  ["Avg Risk", `${report.summary.average_risk_score}/100`],
                ].map(([l, v], i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card p-4 text-center">
                    <div className="text-xl font-bold">{v}</div>
                    <div className="text-xs text-muted-foreground">{l}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="text-lg font-bold">
                    {format(convert(report.summary.total_cost_increase, report.project.currency))}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Cost Increase</div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="text-lg font-bold">
                    {report.summary.total_time_increase_days} days
                  </div>
                  <div className="text-xs text-muted-foreground">Total Time Increase</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-blue-500" /> Scheduled Reports
              </h3>
              <button className="text-primary p-1 hover:bg-primary/10 rounded-lg">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              {scheduledReports.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No scheduled reports.</p>
              ) : (
                scheduledReports.map(sr => (
                  <div key={sr.id} className="p-3 border border-border rounded-xl">
                    <div className="font-medium text-sm">{sr.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{sr.frequency} • {sr.format}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
