import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CheckCircle, XCircle } from "lucide-react";

export default function Approvals() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");

  const load = () => {
    api
      .getChangeRequests({ status: "submitted" })
      .then(setRequests)
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleApprove = async (id: number) => {
    try {
      await api.approveChangeRequest(id, comment);
      toast.success("Approved");
      load();
      setComment("");
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.rejectChangeRequest(id, comment);
      toast.success("Rejected");
      load();
      setComment("");
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pending Approvals</h1>
      {loading ? (
        <p className="text-center py-12 text-muted-foreground">Loading...</p>
      ) : requests.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle className="h-12 w-12 mx-auto mb-3 text-emerald-500/50" />
          <p className="text-muted-foreground">No pending approvals</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((cr) => (
            <div
              key={cr.id}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">
                    {cr.description?.slice(0, 100)}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    By {cr.submitter_name} · {cr.requirement_title}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <StatusBadge status={cr.priority} />
                    <StatusBadge status={cr.complexity} />
                    <StatusBadge status={cr.change_type} />
                  </div>
                </div>
                <StatusBadge status={cr.status} />
              </div>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Comment (optional)"
                className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm mb-3 focus:border-primary outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(cr.id)}
                  className="flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <CheckCircle className="h-4 w-4" /> Approve
                </button>
                <button
                  onClick={() => handleReject(cr.id)}
                  className="flex items-center gap-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
