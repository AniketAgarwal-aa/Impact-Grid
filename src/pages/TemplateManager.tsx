import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import { Plus, Trash2, Files } from "lucide-react";

interface Template {
  id: number;
  name: string;
  description: string;
  category: string;
  usage_count: number;
  is_public: boolean;
}

export default function TemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "change_request",
    content: "{}",
    is_public: true,
  });

  const load = () => {
    api
      .getTemplates()
      .then(setTemplates)
      .catch(() => {});
  };
  useEffect(load, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let content = {};
      try {
        content = JSON.parse(form.content);
      } catch {
        toast.error("Invalid JSON");
        return;
      }
      await api.createTemplate({ ...form, content });
      toast.success("Template created");
      setShowCreate(false);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.deleteTemplate(deleteId);
      toast.success("Deleted");
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Files className="h-6 w-6 text-primary" /> Template Manager
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No templates yet
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold">{t.name}</h3>
                <button
                  onClick={() => setDeleteId(t.id)}
                  className="text-red-500 hover:bg-red-500/10 rounded-lg p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {t.description || "No description"}
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary capitalize">
                  {t.category}
                </span>
                <span className="text-muted-foreground">
                  Used {t.usage_count}x
                </span>
                {t.is_public && (
                  <span className="text-emerald-500">Public</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">Create Template</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Template Name"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
              />
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={2}
                placeholder="Description"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none resize-none"
              />
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
              >
                <option value="requirement">Requirement</option>
                <option value="change_request">Change Request</option>
                <option value="project">Project</option>
              </select>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={4}
                placeholder='JSON content {"key": "value"}'
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-mono focus:border-primary outline-none resize-none"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-xl border px-4 py-2 text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmationModal
        isOpen={!!deleteId}
        title="Delete Template"
        message="This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        confirmText="Delete"
      />
    </div>
  );
}
