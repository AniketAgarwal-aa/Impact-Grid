/**
 * ImpactSensei - Projects Page
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/services/api";
import { useCurrencyStore } from "@/stores/currencyStore";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import { ViewportModal } from "@/components/common/ViewportModal";
import { toast } from "@/components/common/Toast";
import { Plus, Search, FolderKanban, Trash2 } from "lucide-react";

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { format, convert, currency } = useCurrencyStore();
  const [form, setForm] = useState({
    name: "",
    description: "",
    team_size: 5,
    total_budget: 500000,
    timeline_days: 30,
    stage: "mid",
    currency: "INR",
    priority: "medium",
  });

  const loadProjects = () => {
    setLoading(true);
    api
      .getProjects()
      .then(setProjects)
      .catch(() => toast.error("Failed to load projects"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createProject(form);
      toast.success("Project created!");
      setShowCreate(false);
      setForm({
        name: "",
        description: "",
        team_size: 5,
        total_budget: 500000,
        timeline_days: 30,
        stage: "mid",
        currency: "INR",
        priority: "medium",
      });
      loadProjects();
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.deleteProject(deleteId);
      toast.success("Project deleted");
      setDeleteId(null);
      loadProjects();
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Projects</h1>
          <p className="text-muted-foreground">
            {projects.length} total projects
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
        >
          <Plus className="h-4 w-4" /> New Project
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
        />
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Loading projects...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <FolderKanban className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No projects found</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="group rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold group-hover:text-primary transition-colors">
                  {p.name}
                </h3>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {p.description || "No description"}
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-accent/50 p-2">
                  <div className="font-semibold">{p.team_size}</div>
                  <div className="text-muted-foreground">Team</div>
                </div>
                <div className="rounded-lg bg-accent/50 p-2">
                  <div className="font-semibold">{p.timeline_days || p.initial_duration}d</div>
                  <div className="text-muted-foreground">Timeline</div>
                </div>
                <div className="rounded-lg bg-accent/50 p-2">
                  <div className="font-semibold">{p.requirements_count}</div>
                  <div className="text-muted-foreground">Reqs</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="capitalize">{p.stage} stage</span>
                <span>{format(convert(p.total_budget || p.budget || 0, p.currency))} budget</span>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setDeleteId(p.id);
                }}
                className="mt-3 flex items-center gap-1 text-xs text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </Link>
          ))}
        </div>
      )}

      <ViewportModal open={showCreate} onClose={() => setShowCreate(false)} maxWidth="max-w-lg" title="Create New Project">
        <h2 className="text-xl font-bold mb-4">Create New Project</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none resize-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Team Size</label>
              <input type="number" value={form.team_size} onChange={(e) => setForm({ ...form, team_size: +e.target.value })} min={1}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Total Budget</label>
              <input type="number" value={form.total_budget} onChange={(e) => setForm({ ...form, total_budget: +e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Timeline (days)</label>
              <input type="number" value={form.timeline_days} onChange={(e) => setForm({ ...form, timeline_days: +e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Stage</label>
              <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none">
                <option value="early">Early</option><option value="mid">Mid</option><option value="late">Late</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Currency</label>
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none">
                <option value="INR">₹ INR</option><option value="USD">$ USD</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none">
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-accent">Cancel</button>
            <button type="submit" className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Create</button>
          </div>
        </form>
      </ViewportModal>

      <ConfirmationModal
        isOpen={!!deleteId}
        title="Delete Project"
        message="This will permanently delete the project and all its data."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        confirmText="Delete"
      />
    </div>
  );
}
