/**
 * NewAnalysis — Submit change request linked to project + requirement
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/components/common/Toast";
import { Zap, ArrowLeft, ArrowRight, BarChart3 } from "lucide-react";

const MODULES = [
  "Auth", "Database", "API", "Frontend", "Backend", "Reports",
  "Notification", "Payment", "Security", "Infrastructure", "Testing", "Analytics",
];

export default function NewAnalysis() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [projects, setProjects] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const preProjectId = searchParams.get("project_id");
  const preRequirementId = searchParams.get("requirement_id");

  const [form, setForm] = useState({
    project_id: preProjectId ? parseInt(preProjectId) : null as number | null,
    project_name: "",
    team_size: 5,
    total_budget: 500000,
    timeline_days: 30,
    stage: "mid",
    currency: "INR",
    requirement_id: preRequirementId ? parseInt(preRequirementId) : null as number | null,
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
    api.getProjects().then((list) => {
      setProjects(list);
      if (preProjectId) {
        const p = list.find((x: any) => x.id === parseInt(preProjectId));
        if (p) handleProjectSelect(p);
      }
    }).catch(() => {});
  }, [user, navigate, preProjectId]);

  const loadRequirements = async (projectId: number) => {
    try {
      const proj = await api.getProject(projectId) as any;
      setRequirements(proj.requirements || []);
      if (preRequirementId) {
        const rid = parseInt(preRequirementId);
        if (proj.requirements?.some((r: any) => r.id === rid)) {
          setForm((f) => ({ ...f, requirement_id: rid }));
        }
      }
    } catch {
      setRequirements([]);
    }
  };

  const handleProjectSelect = (p: {
    id: number; name: string; team_size: number;
    total_budget?: number; budget?: number;
    timeline_days?: number; initial_duration?: number;
    stage: string; currency: string;
  }) => {
    setForm((f) => ({
      ...f,
      project_id: p.id,
      project_name: p.name,
      team_size: p.team_size,
      total_budget: p.total_budget || p.budget || 500000,
      timeline_days: p.timeline_days || p.initial_duration || 30,
      stage: p.stage,
      currency: p.currency,
      requirement_id: preRequirementId && parseInt(preProjectId || "0") === p.id
        ? parseInt(preRequirementId)
        : f.requirement_id,
    }));
    loadRequirements(p.id);
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
    if (!form.project_id) {
      toast.error("Please select a project");
      return;
    }
    setLoading(true);
    try {
      const result = await api.runAnalysis(form) as { id: number; project_id: number };
      toast.success("Change request analyzed — view your charts now!");
      navigate(`/results/${result.id}?from=submit&project_id=${result.project_id}`);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const canNextStep1 = form.project_id != null;
  const canNextStep2 = form.change_description.trim().length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Submit Change Request</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complexity is calculated automatically. You'll see full charts immediately after submit.
          </p>
        </div>
        {form.project_id && (
          <Link
            to={`/projects/${form.project_id}`}
            className="text-sm text-primary hover:underline shrink-0"
          >
            ← Back to project
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-2 flex-1 rounded-full transition-colors ${step >= s ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Select Project & Requirement</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProjectSelect(p)}
                  className={`rounded-xl border p-3 text-left text-sm transition-all ${form.project_id === p.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/40"}`}
                >
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">Team: {p.team_size}</div>
                </button>
              ))}
            </div>
            {!projects.length && (
              <p className="text-sm text-muted-foreground">No projects linked to your account yet.</p>
            )}
            {form.project_id && requirements.length > 0 && (
              <div>
                <label className="text-sm font-medium block mb-2">Link to Requirement</label>
                <div className="space-y-2">
                  {requirements.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setForm({ ...form, requirement_id: r.id })}
                      className={`w-full rounded-xl border p-3 text-left text-sm transition-all ${form.requirement_id === r.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent/30"}`}
                    >
                      <div className="font-medium">{r.title}</div>
                      {r.description && (
                        <div className="text-xs text-muted-foreground truncate">{r.description}</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {form.project_id && requirements.length === 0 && (
              <p className="text-xs text-muted-foreground bg-accent/50 rounded-xl p-3">
                No requirements yet — a new one will be created from your change description.
              </p>
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
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none resize-none focus:border-primary"
            />
            <textarea
              value={form.justification}
              onChange={(e) => setForm({ ...form, justification: e.target.value })}
              rows={2}
              placeholder="Business justification (optional)"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none resize-none focus:border-primary"
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
                    className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${form.affected_modules.includes(m) ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
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
            <div className="rounded-xl bg-accent/40 p-4 space-y-2">
              <p><strong>Project:</strong> {form.project_name || "—"}</p>
              <p><strong>Requirement:</strong> {
                requirements.find((r) => r.id === form.requirement_id)?.title || "Auto-created from description"
              }</p>
              <p><strong>Change:</strong> {form.change_description}</p>
              <p className="text-muted-foreground flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4" />
                Full impact charts will appear immediately after submit.
              </p>
            </div>
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
              disabled={step === 1 && !canNextStep1 || step === 2 && !canNextStep2}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 shadow-lg shadow-primary/20"
            >
              <Zap className="h-4 w-4" /> {loading ? "Analyzing…" : "Submit & View Charts"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
