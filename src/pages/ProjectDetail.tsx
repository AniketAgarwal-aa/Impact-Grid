import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/services/api";
import { StatusBadge } from "@/components/common/StatusBadge";
import { toast } from "@/components/common/Toast";
import { PageLoader } from "@/components/common/LoadingSpinner";
import { useCurrencyStore } from "@/stores/currencyStore";
import { Plus, Trash2 } from "lucide-react";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [showAddReq, setShowAddReq] = useState(false);
  const [reqForm, setReqForm] = useState({
    title: "",
    description: "",
    complexity: "medium",
    priority: "medium",
  });
  const { format, convert } = useCurrencyStore();

  const load = () => {
    api
      .getProject(parseInt(id!))
      .then(setProject)
      .catch(() => toast.error("Failed to load"))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    if (id) load();
  }, [id]);

  const addReq = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createRequirement({ ...reqForm, project_id: parseInt(id!) });
      toast.success("Requirement added");
      setShowAddReq(false);
      setReqForm({
        title: "",
        description: "",
        complexity: "medium",
        priority: "medium",
      });
      load();
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  const deleteReq = async (rid: number) => {
    try {
      await api.deleteRequirement(rid);
      toast.success("Deleted");
      load();
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  if (loading) return <PageLoader />;
  if (!project)
    return (
      <div className="py-12 text-center text-muted-foreground">
        Project not found
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">
            {project.description || "No description"}
          </p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ["Team", project.team_size],
          ["Duration", `${project.initial_duration}d`],
          ["Stage", project.stage],
          [
            "Cost/Day",
            format(convert(parseFloat(project.cost_per_day), project.currency)),
          ],
        ].map(([l, v], i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card p-4 text-center"
          >
            <div className="text-lg font-bold">{String(v)}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {String(l)}
            </div>
          </div>
        ))}
      </div>

      {/* Members */}
      {project.members?.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold mb-3">Team Members</h2>
          <div className="flex flex-wrap gap-2">
            {project.members.map((m: unknown) => (
              <div
                key={m.id}
                className="flex items-center gap-2 rounded-xl bg-accent/50 px-3 py-2"
              >
                <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                  {m.full_name?.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium">{m.full_name}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {m.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requirements */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-semibold">
            Requirements ({project.requirements?.length || 0})
          </h2>
          <button
            onClick={() => setShowAddReq(true)}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        <div className="divide-y divide-border">
          {(project.requirements || []).length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground text-center">
              No requirements yet
            </p>
          ) : (
            project.requirements.map((r: unknown) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">{r.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={r.complexity} />
                    <StatusBadge status={r.priority} />
                    <StatusBadge status={r.status} />
                  </div>
                </div>
                <button
                  onClick={() => deleteReq(r.id)}
                  className="text-red-500 hover:bg-red-500/10 rounded-lg p-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {showAddReq && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowAddReq(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">Add Requirement</h2>
            <form onSubmit={addReq} className="space-y-4">
              <input
                type="text"
                value={reqForm.title}
                onChange={(e) =>
                  setReqForm({ ...reqForm, title: e.target.value })
                }
                required
                placeholder="Title"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
              />
              <textarea
                value={reqForm.description}
                onChange={(e) =>
                  setReqForm({ ...reqForm, description: e.target.value })
                }
                rows={2}
                placeholder="Description"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none resize-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={reqForm.complexity}
                  onChange={(e) =>
                    setReqForm({ ...reqForm, complexity: e.target.value })
                  }
                  className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <select
                  value={reqForm.priority}
                  onChange={(e) =>
                    setReqForm({ ...reqForm, priority: e.target.value })
                  }
                  className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddReq(false)}
                  className="rounded-xl border px-4 py-2 text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
