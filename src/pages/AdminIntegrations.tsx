import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";
import { Webhook, Plus, Trash2, CheckCircle2, XCircle, Play } from "lucide-react";

export default function AdminIntegrations() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ provider: "slack", event_type: "change_request.created", target_url: "", secret_token: "" });
  const [testing, setTesting] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const data = await api.getWebhooks();
      setWebhooks(data);
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createWebhook(form);
      toast.success("Webhook configured");
      setShowForm(false);
      load();
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteWebhook(id);
      toast.success("Webhook deleted");
      load();
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  const handleTest = async (id: number) => {
    try {
      setTesting(id);
      await api.testWebhook(id);
      toast.success("Test payload sent successfully");
      load(); // Reload to update status
    } catch (err: unknown) {
      toast.error(err.message || "Test failed");
    } finally {
      setTesting(null);
    }
  };

  const providers = ["slack", "jira", "github", "zapier", "custom"];
  const events = ["change_request.created", "change_request.approved", "change_request.rejected", "analysis.completed", "comment.created"];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Webhook className="h-6 w-6 text-primary" /> Integrations & Webhooks
          </h1>
          <p className="text-sm text-muted-foreground">Configure outbound webhooks for Jira, Slack, GitHub, and Zapier.</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add Webhook
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-semibold">Configure Webhook</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Provider</label>
              <select 
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm capitalize"
                value={form.provider} onChange={e => setForm({...form, provider: e.target.value})}
              >
                {providers.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Event Type</label>
              <select 
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                value={form.event_type} onChange={e => setForm({...form, event_type: e.target.value})}
              >
                <option value="*">All Events (*)</option>
                {events.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Target URL</label>
              <input 
                type="url" required
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                placeholder="https://hooks.slack.com/services/..."
                value={form.target_url} onChange={e => setForm({...form, target_url: e.target.value})}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Secret Token (Optional)</label>
              <input 
                type="text"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                placeholder="Token sent in X-ImpactSensei-Signature header"
                value={form.secret_token} onChange={e => setForm({...form, secret_token: e.target.value})}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-xl hover:bg-accent">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm bg-primary text-primary-foreground font-semibold rounded-xl">Save Config</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {webhooks.length === 0 && !showForm && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card border border-border rounded-2xl">
            No webhooks configured. Click "Add Webhook" to integrate with external systems.
          </div>
        )}
        
        {webhooks.map(wh => (
          <div key={wh.id} className="rounded-2xl border border-border bg-card p-5 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className="capitalize font-semibold text-lg">{wh.provider}</span>
                {wh.is_active ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleTest(wh.id)} 
                  disabled={testing === wh.id}
                  className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-accent disabled:opacity-50"
                  title="Send Test Payload"
                >
                  <Play className={`h-4 w-4 ${testing === wh.id ? 'animate-pulse' : ''}`} />
                </button>
                <button 
                  onClick={() => handleDelete(wh.id)} 
                  className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-accent"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">Event:</span>
                <span className="font-mono bg-accent px-1.5 py-0.5 rounded text-xs">{wh.event_type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">Target:</span>
                <span className="truncate max-w-[200px] text-xs" title={wh.target_url}>{wh.target_url}</span>
              </div>
              {wh.last_triggered_at && (
                <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
                  <span className="text-muted-foreground text-xs">Last Triggered:</span>
                  <span className="text-xs">{new Date(wh.last_triggered_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
