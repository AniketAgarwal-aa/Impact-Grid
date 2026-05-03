import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";

export default function TeamDashboard() {
  const [report, setReport] = useState<unknown>(null);
  useEffect(() => {
    api
      .getTeamReport()
      .then(setReport)
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Team Dashboard</h1>
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ["Projects", report.total_projects],
            ["Change Requests", report.total_change_requests],
            ["Pending", report.pending_approvals],
            ["Approved", report.approved],
          ].map(([l, v], i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card p-5 text-center"
            >
              <div className="text-2xl font-bold">{v}</div>
              <div className="text-sm text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
