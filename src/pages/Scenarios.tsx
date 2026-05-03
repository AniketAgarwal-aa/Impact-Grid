import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useCurrencyStore } from "@/stores/currencyStore";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import { Trash2, GitCompare } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Scenarios() {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const { format, convert } = useCurrencyStore();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .getScenarios()
      .then(setScenarios)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.deleteScenario(deleteId);
      toast.success("Deleted");
      setScenarios((s) => s.filter((x) => x.id !== deleteId));
      setDeleteId(null);
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  const toggleSelect = (id: number) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Scenarios</h1>
          <p className="text-muted-foreground">
            {scenarios.length} saved scenarios
          </p>
        </div>
        {selected.length >= 2 && (
          <button
            onClick={() => navigate(`/compare?ids=${selected.join(",")}`)}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <GitCompare className="h-4 w-4" /> Compare ({selected.length})
          </button>
        )}
      </div>
      {loading ? (
        <p className="text-center py-12 text-muted-foreground">Loading...</p>
      ) : scenarios.length === 0 ? (
        <div className="text-center py-16">
          <GitCompare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            No scenarios saved yet. Run an analysis and save it!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {scenarios.map((s) => (
            <div
              key={s.id}
              className={`rounded-2xl border bg-card p-5 transition-all hover:shadow-md cursor-pointer ${selected.includes(s.id) ? "border-primary bg-primary/5" : "border-border"}`}
              onClick={() => toggleSelect(s.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(s.id)}
                    readOnly
                    className="rounded"
                  />
                  <div>
                    <h3 className="font-semibold">{s.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {s.project_name} ·{" "}
                      {s.created_at
                        ? new Date(s.created_at).toLocaleDateString()
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {s.analysis_summary && (
                    <>
                      <StatusBadge status={s.analysis_summary.risk_level} />
                      <span className="text-sm font-medium">
                        {s.analysis_summary.change_size}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {format(
                          convert(
                            s.analysis_summary.cost_increase,
                            s.analysis_summary.currency,
                          ),
                        )}
                      </span>
                    </>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(s.id);
                    }}
                    className="text-red-500 hover:bg-red-500/10 rounded-lg p-1.5"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmationModal
        isOpen={!!deleteId}
        title="Delete Scenario"
        message="This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        confirmText="Delete"
      />
    </div>
  );
}
