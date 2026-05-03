/** Confirmation modal for destructive actions */
import { AlertTriangle } from "lucide-react";

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  onConfirm,
  onCancel,
  danger = true,
}: Props) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl mx-auto mb-4 ${danger ? "bg-red-500/10" : "bg-primary/10"}`}
        >
          <AlertTriangle
            className={`h-6 w-6 ${danger ? "text-red-500" : "text-primary"}`}
          />
        </div>
        <h3 className="text-lg font-bold text-center mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground text-center mb-6">
          {message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
            }}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors ${danger ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90"}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
