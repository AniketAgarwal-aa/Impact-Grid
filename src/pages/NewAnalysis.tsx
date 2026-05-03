/**
 * ImpactSensei - New Analysis (Multi-step form)
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";
import { Zap, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";

const MODULES = [
  "Auth",
  "Database",
  "API",
  "Frontend",
  "Backend",
  "Reports",
  "Notification",
  "Payment",
  "Security",
  "Infrastructure",
  "Testing",
  "Analytics",
  "Integration",
  "Documentation",
];

export default function NewAnalysis() {
  const [step, setStep] = useState(1);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    project_id: null as number | null,
    project_name: "",
    project_description: "",
    team_size: 5,
    cost_per_day: 5000,
    initial_duration: 30,
    stage: "mid",
    currency: "INR",
    change_type: "modification",
    change_priority: "medium",
    change_complexity: "medium",
    affected_modules: [] as string[],
    change_description: "",
    justification: "",
  });

  useEffect(() => {
    api
      .getProjects()
      .then(setProjects)
      .catch(() => {});
  }, []);

  const handleProjectSelect = (p: unknown) => {
    setForm({
      ...form,
      project_id: p.id,
      project_name: p.name,
      project_description: p.description || "",
      team_size: p.team_size,
      cost_per_day: parseFloat(p.cost_per_day) || 5000,
      initial_duration: p.initial_duration,
      stage: p.stage,
      currency: p.currency,
    });
  };

  const toggleModule = (m: string) => {
    setForm({
      ...form,
      affected_modules: form.affected_modules.includes(m)
        ? form.affected_modules.filter((x) => x !== m)
        : [...form.affected_modules, m],
    });
  };

  const handleSubmit = async () => {
    if (!form.change_description) {
      toast.error("Please describe the change");
      return;
    }
    setLoading(true);
    try {
      const result = await api.runAnalysis(form);
      toast.success("Analysis complete!");
      navigate(`/results/${result.id}`);
    } catch (err: unknown) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">New Impact Analysis</h1>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {s}
            </div>
            <span
              className={`text-sm hidden sm:inline ${step >= s ? "text-foreground" : "text-muted-foreground"}`}
            >
              {s === 1 ? "Project" : s === 2 ? "Change" : "Review"}
            </span>
            {s < 3 && (
              <div
                className={`h-0.5 w-8 ${step > s ? "bg-primary" : "bg-muted"}`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold">Project Details</h2>
            {projects.length > 0 && (
              <div>
                <label className="text-sm font-medium block mb-2">
                  Select Existing Project (optional)
                </label>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {projects.slice(0, 6).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleProjectSelect(p)}
                      className={`rounded-xl border p-3 text-left text-sm transition-all ${form.project_id === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                    >
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Team: {p.team_size} · {p.stage}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={form.project_name}
                  onChange={(e) =>
                    setForm({ ...form, project_name: e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
                  placeholder="My Project"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">
                  Team Size
                </label>
                <input
                  type="number"
                  value={form.team_size}
                  onChange={(e) =>
                    setForm({ ...form, team_size: +e.target.value })
                  }
                  min={1}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">
                  Cost/Day ({form.currency})
                </label>
                <input
                  type="number"
                  value={form.cost_per_day}
                  onChange={(e) =>
                    setForm({ ...form, cost_per_day: +e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">
                  Duration (days)
                </label>
                <input
                  type="number"
                  value={form.initial_duration}
                  onChange={(e) =>
                    setForm({ ...form, initial_duration: +e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Stage</label>
                <select
                  value={form.stage}
                  onChange={(e) => setForm({ ...form, stage: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
                >
                  <option value="early">Early</option>
                  <option value="mid">Mid</option>
                  <option value="late">Late</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">
                  Currency
                </label>
                <select
                  value={form.currency}
                  onChange={(e) =>
                    setForm({ ...form, currency: e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
                >
                  <option value="INR">₹ INR</option>
                  <option value="USD">$ USD</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold">Change Request Details</h2>
            <div>
              <label className="text-sm font-medium block mb-1">
                Description *
              </label>
              <textarea
                value={form.change_description}
                onChange={(e) =>
                  setForm({ ...form, change_description: e.target.value })
                }
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none resize-none"
                placeholder="Describe the change..."
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Type</label>
                <select
                  value={form.change_type}
                  onChange={(e) =>
                    setForm({ ...form, change_type: e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
                >
                  <option value="addition">Addition</option>
                  <option value="modification">Modification</option>
                  <option value="removal">Removal</option>
                  <option value="refactor">Refactor</option>
                  <option value="optimization">Optimization</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">
                  Priority
                </label>
                <select
                  value={form.change_priority}
                  onChange={(e) =>
                    setForm({ ...form, change_priority: e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">
                  Complexity
                </label>
                <select
                  value={form.change_complexity}
                  onChange={(e) =>
                    setForm({ ...form, change_complexity: e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="very_high">Very High</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">
                Affected Modules
              </label>
              <div className="flex flex-wrap gap-2">
                {MODULES.map((m) => (
                  <button
                    key={m}
                    onClick={() => toggleModule(m)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${form.affected_modules.includes(m) ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/30"}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">
                Justification
              </label>
              <textarea
                value={form.justification}
                onChange={(e) =>
                  setForm({ ...form, justification: e.target.value })
                }
                rows={2}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none resize-none"
                placeholder="Why is this change needed?"
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold">Review & Analyze</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-accent/50 p-4">
                <h3 className="text-sm font-semibold mb-2">Project</h3>
                <p className="text-sm">{form.project_name || "New Project"}</p>
                <p className="text-xs text-muted-foreground">
                  Team: {form.team_size} · Duration: {form.initial_duration}d ·
                  Stage: {form.stage}
                </p>
              </div>
              <div className="rounded-xl bg-accent/50 p-4">
                <h3 className="text-sm font-semibold mb-2">Change</h3>
                <p className="text-sm capitalize">
                  {form.change_type} · {form.change_priority} priority
                </p>
                <p className="text-xs text-muted-foreground">
                  Complexity: {form.change_complexity} ·{" "}
                  {form.affected_modules.length} modules
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-accent/50 p-4">
              <h3 className="text-sm font-semibold mb-1">Description</h3>
              <p className="text-sm text-muted-foreground">
                {form.change_description || "No description"}
              </p>
            </div>
            {form.affected_modules.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {form.affected_modules.map((m) => (
                  <span
                    key={m}
                    className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary font-medium"
                  >
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm hover:bg-accent disabled:opacity-30 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <Zap className="h-4 w-4" /> Run Analysis
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
