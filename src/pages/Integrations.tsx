/**
 * Integrations — Webhook management page.
 * Jira · Slack · GitHub · Zapier · Generic HTTP
 */
import { useEffect, useState } from "react";
import { Plug, Plus, Trash2, Play, CheckCircle, XCircle, Globe } from "lucide-react";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";

const INTEGRATION_ICONS: Record<string, string> = {
  slack: "💬",
  jira: "🔵",
  github: "🐙",
  zapier: "⚡",
  generic: "🌐",
};

const AVAILABLE_EVENTS = [
  "change_request.created",
  "change_request.approved",
  "change_request.rejected",
  "analysis.completed",
  "project.created",
  "user.registered",
  "report.generated",
];

interface Webhook {
  id: number;
  name: string;
  type: string;
  url: string;
  events: string[];
  enabled: boolean;
  created_at: string;
}

interface FormData {
  name: string;
  type: string;
  url: string;
  events: string[];
  enabled: boolean;
}

const DEFAULT_FORM: FormData = {
  name: "",
  type: "slack",
  url: "",
  events: [],
  enabled: true,
};

export default function Integrations() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [testing, setTesting] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const data = await api.get("/api/integrations/webhooks");
      setWebhooks(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.url || !form.name) {
      toast.error("Name and URL are required");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/integrations/webhooks", form);
      toast.success("Webhook created");
      setShowForm(false);
      setForm(DEFAULT_FORM);
      await load();
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/integrations/webhooks/${id}`);
      toast.success("Webhook deleted");
      await load();
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  };

  const handleTest = async (id: number) => {
    setTesting(id);
    try {
      const result = await api.post(`/api/integrations/webhooks/${id}/test`, {});
      if (result.success) {
        toast.success(`Test delivered (HTTP ${result.status_code})`);
      } else {
        toast.error(`Test failed: ${result.error}`);
      }
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setTesting(null);
    }
  };

  const toggleEvent = (event: string) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(event)
        ? f.events.filter((e) => e !== event)
        : [...f.events, event],
    }));
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-sm text-muted-foreground">
            Connect ImpactSensei with your tools via webhooks
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add Webhook
        </button>
      </div>

      {/* Supported platforms */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { type: "slack", name: "Slack", desc: "Post to channels" },
          { type: "jira", name: "Jira", desc: "Create/update issues" },
          { type: "github", name: "GitHub", desc: "Trigger workflows" },
          { type: "zapier", name: "Zapier", desc: "Automate anything" },
          { type: "generic", name: "Custom", desc: "Any HTTP endpoint" },
        ].map((p) => (
          <div
            key={p.type}
            className="rounded-2xl border border-border bg-card p-4 text-center space-y-1 hover:border-primary/30 cursor-default transition-colors"
          >
            <div className="text-2xl">{INTEGRATION_ICONS[p.type]}</div>
            <p className="text-sm font-medium">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.desc}</p>
          </div>
        ))}
      </div>

      {/* Webhook list */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm">Active Webhooks ({webhooks.length})</h2>
        {webhooks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <Plug className="mx-auto h-8 w-8 text-muted-foreground mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">No webhooks configured yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 rounded-xl border border-border px-4 py-1.5 text-xs hover:bg-accent"
            >
              Add your first webhook
            </button>
          </div>
        ) : (
          webhooks.map((wh) => (
            <div
              key={wh.id}
              className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4"
            >
              <span className="text-2xl">{INTEGRATION_ICONS[wh.type] || "🌐"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{wh.name}</p>
                  <span className={`h-2 w-2 rounded-full ${wh.enabled ? "bg-emerald-500" : "bg-muted"}`} />
                </div>
                <p className="text-xs text-muted-foreground truncate">{wh.url}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {wh.events.slice(0, 3).map((e) => (
                    <span key={e} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                      {e}
                    </span>
                  ))}
                  {wh.events.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{wh.events.length - 3} more</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleTest(wh.id)}
                  disabled={testing === wh.id}
                  title="Send test payload"
                  className="flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                >
                  {testing === wh.id ? (
                    <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  Test
                </button>
                <button
                  onClick={() => handleDelete(wh.id)}
                  title="Delete"
                  className="rounded-xl border border-red-500/20 p-1.5 text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 space-y-4 shadow-2xl"
          >
            <h2 className="font-semibold text-lg">New Webhook</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1">Name</label>
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary outline-none"
                  placeholder="My Slack Notifier"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Type</label>
                <select
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary outline-none"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="slack">Slack</option>
                  <option value="jira">Jira</option>
                  <option value="github">GitHub</option>
                  <option value="zapier">Zapier</option>
                  <option value="generic">Generic HTTP</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium block mb-1">Webhook URL</label>
              <input
                type="url"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary outline-none"
                placeholder="https://hooks.slack.com/..."
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium block mb-2">Trigger Events</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_EVENTS.map((event) => (
                  <button
                    key={event}
                    type="button"
                    onClick={() => toggleEvent(event)}
                    className={`rounded-full px-3 py-1 text-xs transition-colors ${
                      form.events.includes(event)
                        ? "bg-primary text-primary-foreground"
                        : "border border-border hover:bg-accent"
                    }`}
                  >
                    {event}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to receive all events
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="enabled"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="enabled" className="text-sm">Enable immediately</label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-xl border border-border py-2 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Webhook"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
