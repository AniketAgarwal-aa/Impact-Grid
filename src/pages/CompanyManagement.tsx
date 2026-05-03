/**
 * ImpactSensei v5.0 - Company Management (Admin only)
 */
import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  Building2,
  Plus,
  Search,
  Trash2,
  Users,
  FolderKanban,
  Edit,
} from "lucide-react";

export default function CompanyManagement() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selected, setSelected] = useState<unknown>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [form, setForm] = useState({
    name: "",
    subscription_tier: "free",
    max_projects: 10,
    max_users: 50,
  });
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api
      .getCompanies({ page, search })
      .then((d) => {
        setCompanies(d.companies || []);
        setTotal(d.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [page, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCompany(form);
      toast.success("Company created");
      setShowCreate(false);
      setForm({
        name: "",
        subscription_tier: "free",
        max_projects: 10,
        max_users: 50,
      });
      load();
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.deleteCompany(deleteId);
      toast.success("Company deleted");
      setDeleteId(null);
      load();
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  const openDetail = async (id: number) => {
    try {
      const d = await api.getCompany(id);
      setSelected(d);
      setShowDetail(true);
    } catch {
      toast.error("Failed to load");
    }
  };

  const tierColor: Record<string, string> = {
    free: "text-gray-400",
    starter: "text-blue-500",
    pro: "text-purple-500",
    enterprise: "text-amber-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Company Management
          </h1>
          <p className="text-muted-foreground">{total} companies registered</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
        >
          <Plus className="h-4 w-4" /> New Company
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search companies..."
          className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm focus:border-primary outline-none"
        />
      </div>

      {loading ? (
        <p className="text-center py-12 text-muted-foreground">Loading...</p>
      ) : companies.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">No companies yet</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <div
              key={c.id}
              className="group rounded-2xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    {c.slug}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold uppercase ${tierColor[c.subscription_tier] || "text-gray-400"}`}
                >
                  {c.subscription_tier}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="rounded-lg bg-accent/50 p-2 text-center">
                  <div className="text-sm font-bold flex items-center justify-center gap-1">
                    <Users className="h-3 w-3" />
                    {c.user_count}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    / {c.max_users} users
                  </div>
                </div>
                <div className="rounded-lg bg-accent/50 p-2 text-center">
                  <div className="text-sm font-bold flex items-center justify-center gap-1">
                    <FolderKanban className="h-3 w-3" />
                    {c.project_count}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    / {c.max_projects} projects
                  </div>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openDetail(c.id)}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-border py-1.5 text-xs hover:bg-accent"
                >
                  <Edit className="h-3 w-3" /> Details
                </button>
                <button
                  onClick={() => setDeleteId(c.id)}
                  className="flex items-center gap-1 rounded-lg border border-red-500/20 py-1.5 px-3 text-xs text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Create Company</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Acme Corp"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">
                  Subscription Tier
                </label>
                <select
                  value={form.subscription_tier}
                  onChange={(e) =>
                    setForm({ ...form, subscription_tier: e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
                >
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Max Projects
                  </label>
                  <input
                    type="number"
                    value={form.max_projects}
                    onChange={(e) =>
                      setForm({ ...form, max_projects: +e.target.value })
                    }
                    min={1}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Max Users
                  </label>
                  <input
                    type="number"
                    value={form.max_users}
                    onChange={(e) =>
                      setForm({ ...form, max_users: +e.target.value })
                    }
                    min={1}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in overflow-y-auto max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-1">{selected.name}</h2>
            <p className="text-xs text-muted-foreground font-mono mb-4">
              {selected.slug} · {selected.subscription_tier}
            </p>
            <div className="space-y-3 mb-4">
              <h3 className="text-sm font-semibold">
                Users ({selected.users?.length || 0})
              </h3>
              {(selected.users || []).slice(0, 5).map((u: unknown) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-xl bg-accent/50 px-3 py-2 text-sm"
                >
                  <span>{u.full_name}</span>
                  <StatusBadge status={u.role} />
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">
                Projects ({selected.projects?.length || 0})
              </h3>
              {(selected.projects || []).slice(0, 5).map((p: unknown) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl bg-accent/50 px-3 py-2 text-sm"
                >
                  <span>{p.name}</span>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowDetail(false)}
              className="mt-5 w-full rounded-xl border border-border py-2 text-sm hover:bg-accent"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteId}
        title="Delete Company"
        message="This will permanently delete the company and all associated data."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        confirmText="Delete"
      />
    </div>
  );
}
