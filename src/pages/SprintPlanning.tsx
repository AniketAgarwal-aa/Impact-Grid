import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";
import { Calendar, Plus, ListTodo, TrendingDown } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
  boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
};
const tooltipItemStyle  = { color: "hsl(var(--foreground))" };
const tooltipLabelStyle = { color: "hsl(var(--muted-foreground))", fontWeight: 600 as const };
const axisTick = { fill: "hsl(var(--foreground))" };

export default function SprintPlanning() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | "">("");
  const [sprints, setSprints] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<number | "">("");
  const [burndown, setBurndown] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", goal: "", start_date: "", end_date: "" });

  useEffect(() => {
    api.getProjects().then(setProjects).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedProject) {
      setSprints([]);
      return;
    }
    api.getSprints(Number(selectedProject)).then(setSprints).catch(() => {});
  }, [selectedProject]);

  useEffect(() => {
    if (!selectedSprint) {
      setTasks([]);
      setBurndown(null);
      return;
    }
    Promise.all([
      api.getSprintTasks(Number(selectedSprint)),
      api.getBurndown(Number(selectedSprint))
    ]).then(([t, b]) => {
      setTasks(t);
      setBurndown(b);
    }).catch(() => {});
  }, [selectedSprint]);

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return toast.error("Select a project first");
    try {
      await api.createSprint({ project_id: Number(selectedProject), ...form });
      toast.success("Sprint created");
      setShowForm(false);
      api.getSprints(Number(selectedProject)).then(setSprints);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" /> Sprint Planning
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage sprints, capacity, and view burndown charts.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 p-4 rounded-2xl border border-border bg-card">
        <select 
          className="flex-1 min-w-[200px] rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-primary outline-none"
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">-- Select Project --</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        
        <select 
          className="flex-1 min-w-[200px] rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-primary outline-none disabled:opacity-50"
          value={selectedSprint}
          onChange={e => setSelectedSprint(e.target.value ? Number(e.target.value) : "")}
          disabled={!selectedProject}
        >
          <option value="">-- Select Sprint --</option>
          {sprints.map(s => (
            <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
          ))}
        </select>

        {selectedProject && (
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            <Plus className="h-4 w-4" /> New Sprint
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreateSprint} className="rounded-2xl border border-border bg-card p-6 space-y-4 max-w-md animate-scale-in">
          <h3 className="font-semibold text-lg border-b border-border pb-2">Create Sprint</h3>
          <input 
            placeholder="Sprint Name" 
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
            value={form.name} onChange={e => setForm({...form, name: e.target.value})} required 
          />
          <input 
            placeholder="Goal" 
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
            value={form.goal} onChange={e => setForm({...form, goal: e.target.value})} 
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Start Date</label>
              <input 
                type="date" className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
                value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} required 
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">End Date</label>
              <input 
                type="date" className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
                value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} required 
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 text-sm font-medium rounded-xl border border-border hover:bg-accent transition-colors">Cancel</button>
            <button type="submit" className="px-6 py-2.5 text-sm bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">Create</button>
          </div>
        </form>
      )}

      {selectedSprint && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <TrendingDown className="h-5 w-5 text-emerald-500" /> Burndown Chart
            </h3>
            {burndown?.data && burndown.data.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={burndown.data} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, ...axisTick }} />
                  <YAxis tick={{ fontSize: 11, ...axisTick }} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                  <Line type="monotone" dataKey="ideal_remaining" stroke="#94a3b8" strokeDasharray="5 5" dot={false} name="Ideal" strokeWidth={2} />
                  <Line type="monotone" dataKey="actual_remaining" stroke="#10b981" strokeWidth={2.5} name="Actual" dot={{ r: 4, fill: "#10b981" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm rounded-xl bg-accent/20 border border-dashed border-border">
                No burndown data available
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <ListTodo className="h-5 w-5 text-blue-500" /> Sprint Tasks ({tasks.length})
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {tasks.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground rounded-xl bg-accent/20">
                  No tasks in this sprint.
                </div>
              ) : (
                tasks.map(t => (
                  <div key={t.id} className="flex justify-between items-center p-4 rounded-xl border border-border bg-background hover:border-primary/30 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.estimated_hours}h est.</p>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
