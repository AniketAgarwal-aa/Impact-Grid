import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { ScrollText } from "lucide-react";

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("");
  const actions = [
    "CREATE",
    "UPDATE",
    "DELETE",
    "APPROVE",
    "REJECT",
    "LOGIN",
    "LOGOUT",
    "EXPORT",
  ];

  useEffect(() => {
    api
      .getAuditLogs({ page, action: filter })
      .then((d) => {
        setLogs(d.logs);
        setTotal(d.total);
      })
      .catch(() => {});
  }, [page, filter]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ScrollText className="h-6 w-6 text-primary" /> Audit Logs
      </h1>
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
      >
        <option value="">All Actions</option>
        {actions.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-accent/50">
              <th className="p-3 text-left">Time</th>
              <th className="p-3 text-left">User</th>
              <th className="p-3 text-left">Action</th>
              <th className="p-3 text-left">Entity</th>
              <th className="p-3 text-left">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr
                key={l.id}
                className="border-b border-border/50 hover:bg-accent/30"
              >
                <td className="p-3 text-xs text-muted-foreground">
                  {l.created_at ? new Date(l.created_at).toLocaleString() : ""}
                </td>
                <td className="p-3">{l.user_name || "System"}</td>
                <td className="p-3">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {l.action}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">
                  {l.entity_type} #{l.entity_id}
                </td>
                <td className="p-3 text-xs max-w-xs truncate text-muted-foreground">
                  {l.details || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-30 hover:bg-accent"
        >
          Prev
        </button>
        <span className="px-3 py-1.5 text-sm">Page {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent"
        >
          Next
        </button>
      </div>
    </div>
  );
}
