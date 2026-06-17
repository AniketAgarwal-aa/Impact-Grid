/**
 * Impact Grid - New Change Request (clients only)
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/components/common/Toast";
import { Zap, ArrowLeft, ArrowRight } from "lucide-react";

const MODULES = [
  "Auth", "Database", "API", "Frontend", "Backend", "Reports",
  "Notification", "Payment", "Security", "Infrastructure", "Testing", "Analytics",
];

export default function NewAnalysis() {
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    project_id: null as number | null,
    project_name: "",
    team_size: 5,
    total_budget: 500000,
    timeline_days: 30,
    stage: "mid",
    currency: "INR",
    change_type: "modification",
    change_priority: "medium",
    affected_modules: [] as string[],
    change_description: "",
    justification: "",
  });

  useEffect(() => {
    if (user?.role !== "client") {
      toast.error("Only clients can submit change requests");
      navigate("/dashboard");
      return;
    }
    api.getProjects().then(setProjects).catch(() => {});
  }, [user, navigate]);

  const handleProjectSelect = (p: { id: number; name: string; team_size: number; total_budget?: number; budget?: number; timeline_days?: number; initial_duration?: number; stage: string; currency: string }) => {
    setForm({
      ...form,
      project_id: p.id,
      project_name: p.name,
      team_size: p.team_size,
      total_budget: p.total_budget || p.budget || 500000,
      timeline_days: p.timeline_days || p.initial_duration || 30,
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
      toast.success("Change request submitted for analysis!");
      navigate(`/results/${result.id}`);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Submit Change Request</h1>
      <p className="text-sm text-muted-foreground">
        Complexity is calculated automatically from your inputs.
      </p>

      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-2 flex-1 rounded-full ${step >= s ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Select Project</h2>
            <div className="grid grid-cols-2 gap-2">
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProjectSelect(p)}
                  className={`rounded-xl border p-3 text-left text-sm ${form.project_id === p.id ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">Team: {p.team_size}</div>
                </button>
              ))}
            </div>
            {!projects.length && (
              <p className="text-sm text-muted-foreground">No projects linked to your account yet.</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Describe the Change</h2>
            <textarea
              value={form.change_description}
              onChange={(e) => setForm({ ...form, change_description: e.target.value })}
              rows={4}
              placeholder="What needs to change and why?"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none resize-none"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Type</label>
                <select
                  value={form.change_type}
                  onChange={(e) => setForm({ ...form, change_type: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
                >
                  <option value="addition">Addition</option>
                  <option value="modification">Modification</option>
                  <option value="removal">Removal</option>
                  <option value="refactor">Refactor</option>
                  <option value="optimization">Optimization</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Priority</label>
                <select
                  value={form.change_priority}
                  onChange={(e) => setForm({ ...form, change_priority: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Affected Modules</label>
              <div className="flex flex-wrap gap-2">
                {MODULES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleModule(m)}
                    className={`rounded-lg border px-3 py-1.5 text-xs ${form.affected_modules.includes(m) ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 text-sm">
            <p><strong>Project:</strong> {form.project_name || "—"}</p>
            <p><strong>Change:</strong> {form.change_description}</p>
            <p className="text-muted-foreground">Complexity will be auto-calculated on submit.</p>
          </div>
        )}

        <div className="flex justify-between mt-6 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Zap className="h-4 w-4" /> Submit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
