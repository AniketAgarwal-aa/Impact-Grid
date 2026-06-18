import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";
import { Download, Filter, Search, FileText } from "lucide-react";

interface AuditLog {
  id: number;
  user_id: number;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export default function AdminAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    user_email: "",
    action: "",
    entity_type: "",
    date_from: "",
    date_to: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs() as AuditLog[];
      setLogs(data);
      setFilteredLogs(data);
    } catch (err) {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    let filtered = logs;

    if (filters.user_email) {
      filtered = filtered.filter((log) =>
        log.user_email.toLowerCase().includes(filters.user_email.toLowerCase())
      );
    }
    if (filters.action) {
      filtered = filtered.filter((log) =>
        log.action.toLowerCase().includes(filters.action.toLowerCase())
      );
    }
    if (filters.entity_type) {
      filtered = filtered.filter((log) =>
        log.entity_type.toLowerCase().includes(filters.entity_type.toLowerCase())
      );
    }
    if (filters.date_from) {
      filtered = filtered.filter(
        (log) => new Date(log.created_at) >= new Date(filters.date_from)
      );
    }
    if (filters.date_to) {
      filtered = filtered.filter(
        (log) => new Date(log.created_at) <= new Date(filters.date_to)
      );
    }

    setFilteredLogs(filtered);
  }, [filters, logs]);

  const exportCSV = () => {
    const headers = ["User", "Action", "Entity Type", "Entity ID", "IP Address", "Timestamp", "Details"];
    const rows = filteredLogs.map((log) => [
      log.user_email,
      log.action,
      log.entity_type,
      log.entity_id || "",
      log.ip_address || "",
      log.created_at,
      log.details || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  const exportJSON = () => {
    const jsonContent = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON exported successfully");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> Audit Logs
        </h1>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={exportJSON}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            <Download className="h-4 w-4" /> Export JSON
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          <input
            type="text"
            placeholder="Search by email"
            value={filters.user_email}
            onChange={(e) => setFilters({ ...filters, user_email: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary outline-none"
          />
          <input
            type="text"
            placeholder="Search by action"
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary outline-none"
          />
          <input
            type="text"
            placeholder="Search by entity type"
            value={filters.entity_type}
            onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary outline-none"
          />
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary outline-none"
          />
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No audit logs found
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    IP Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm">{log.user_email}</td>
                    <td className="px-4 py-3 text-sm font-medium">{log.action}</td>
                    <td className="px-4 py-3 text-sm">
                      {log.entity_type}
                      {log.entity_id && ` #${log.entity_id}`}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {log.ip_address || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
            Showing {filteredLogs.length} of {logs.length} logs
          </div>
        </div>
      )}
    </div>
  );
}