import { useEffect } from "react";
import { api } from "@/services/api";
import { useNotificationStore } from "@/stores/notificationStore";
import { toast } from "@/components/common/Toast";
import { Bell, CheckCheck, Trash2 } from "lucide-react";

export default function Notifications() {
  const { items, setItems, markReadLocal, removeLocal } = useNotificationStore();

  useEffect(() => {
    api
      .getNotifications()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [setItems]);

  const markAllRead = async () => {
    try {
      await api.markAllRead();
      setItems(items.map((n) => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" /> Notifications
        </h1>
        <button
          onClick={markAllRead}
          className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-accent transition-colors"
        >
          <CheckCheck className="h-4 w-4" /> Mark all read
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl border border-border bg-card p-4 flex items-start justify-between gap-3 ${
                n.is_read ? "opacity-80" : "ring-1 ring-primary/20"
              }`}
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">
                  {n.title || "Notification"}
                </div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  {n.message || ""}
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {!n.is_read && (
                  <button
                    onClick={async () => {
                      try {
                        await api.markNotificationRead(n.id);
                        markReadLocal(n.id);
                      } catch {
                        toast.error("Failed to mark read");
                      }
                    }}
                    className="rounded-xl border border-border px-3 py-2 text-xs hover:bg-accent transition-colors"
                  >
                    Mark read
                  </button>
                )}
                <button
                  onClick={async () => {
                    try {
                      await api.deleteNotification(n.id);
                      removeLocal(n.id);
                    } catch {
                      toast.error("Failed to delete");
                    }
                  }}
                  className="rounded-xl border border-border px-3 py-2 text-xs hover:bg-accent transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

