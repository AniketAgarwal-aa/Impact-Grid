import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

export default function Approvals() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Record<number, string>>({});

  const load = () => {
    api
      .getChangeRequests({})
      .then((data) => setRequests(data.filter((c: any) => c.status === "submitted" || c.status === "analyzed")))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleApprove = async (id: number) => {
    try {
      await api.approveChangeRequest(id, comments[id] || "");
      toast.success("Approved");
      load();
      setComments((prev) => ({ ...prev, [id]: "" }));
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.rejectChangeRequest(id, comments[id] || "");
      toast.success("Rejected");
      load();
      setComments((prev) => ({ ...prev, [id]: "" }));
    } catch (err: any) {
      toast.error(err.message || "Failed to reject");
    }
  };

  const handleCommentChange = (id: number, value: string) => {
    setComments((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CheckCircle className="h-6 w-6 text-primary" /> Pending Approvals
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Review and approve or reject submitted change requests.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-16 text-center bg-card/50">
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-emerald-500/20" />
          <h2 className="text-lg font-bold mb-1">You're all caught up!</h2>
          <p className="text-sm text-muted-foreground">There are no pending change requests requiring your approval.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((cr) => (
            <div
              key={cr.id}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-lg">
                      {cr.description?.slice(0, 100)}
                    </h3>
                    {cr.analysis_id && (
                      <Link
                        to={`/results/${cr.analysis_id}`}
                        className="text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-lg transition-colors"
                      >
                        View Analysis
                      </Link>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Submitted by <span className="font-medium text-foreground">{cr.submitter_name}</span> · {cr.requirement_title}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={cr.priority} />
                    <StatusBadge status={cr.complexity} />
                    <StatusBadge status={cr.change_type} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground mr-2">Current Status:</span>
                  <StatusBadge status={cr.status} />
                </div>
              </div>

              {!cr.analysis_id && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-600">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <p>This request has not been analyzed yet. Approving it without analysis is risky.</p>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-3 mt-4 pt-4 border-t border-border">
                <input
                  type="text"
                  value={comments[cr.id] || ""}
                  onChange={(e) => handleCommentChange(cr.id, e.target.value)}
                  placeholder="Add a comment or justification (optional)"
                  className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleReject(cr.id)}
                    className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                  <button
                    onClick={() => handleApprove(cr.id)}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    <CheckCircle className="h-4 w-4" /> Approve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
