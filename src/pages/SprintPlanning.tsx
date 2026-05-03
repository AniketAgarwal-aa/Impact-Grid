import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";
import { Calendar, Plus, ListTodo, TrendingDown } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function SprintPlanning() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | "">("");
  const [sprints, setSprints] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<number | "">("");
  const [burndown, setBurndown] = useState<unknown>(null);
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
    } catch (err: unknown) {
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
          <p className="text-sm text-muted-foreground">Manage sprints, capacity, and view burndown charts.</p>
        </div>
      </div>

      <div className="flex gap-4">
        <select 
          className="rounded-xl border border-border bg-card px-4 py-2 text-sm"
          value={selectedProject}
          onChange={e => setSelectedProject(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">-- Select Project --</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        
        <select 
          className="rounded-xl border border-border bg-card px-4 py-2 text-sm"
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
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground font-semibold"
          >
            <Plus className="h-4 w-4" /> New Sprint
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreateSprint} className="rounded-2xl border border-border bg-card p-6 space-y-4 max-w-md">
          <h3 className="font-semibold text-lg">Create Sprint</h3>
          <input 
            placeholder="Sprint Name" 
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            value={form.name} onChange={e => setForm({...form, name: e.target.value})} required 
          />
          <input 
            placeholder="Goal" 
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            value={form.goal} onChange={e => setForm({...form, goal: e.target.value})} 
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Start Date</label>
              <input 
                type="date" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} required 
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">End Date</label>
              <input 
                type="date" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} required 
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm rounded-xl hover:bg-accent">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm bg-primary text-primary-foreground font-semibold rounded-xl">Create</button>
          </div>
        </form>
      )}

      {selectedSprint && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-primary" /> Burndown Chart
            </h3>
            {burndown?.data ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={burndown.data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="day" tick={{fontSize: 12}} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip contentStyle={{background: 'var(--card)', border: '1px solid var(--border)'}} />
                  <Line type="monotone" dataKey="ideal_remaining" stroke="#94a3b8" strokeDasharray="5 5" dot={false} name="Ideal" />
                  <Line type="monotone" dataKey="actual_remaining" stroke="#3b82f6" strokeWidth={2} name="Actual" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-xl">
                No burndown data available
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-primary" /> Sprint Tasks ({tasks.length})
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks in sprint.</p>
              ) : (
                tasks.map(t => (
                  <div key={t.id} className="flex justify-between items-center p-3 rounded-xl border border-border hover:bg-accent/30">
                    <div>
                      <p className="text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.estimated_hours}h est.</p>
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
