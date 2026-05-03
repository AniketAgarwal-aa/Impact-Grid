/**
 * Status Badge — covers statuses, priorities, risk levels, roles
 */
const VARIANTS: Record<string, string> = {
  // Status
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  inactive: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  archived: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  draft: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  submitted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  under_review: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20",
  analyzed: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  on_hold: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
  // Risk
  low: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
  emergency: "bg-red-700/10 text-red-700 border-red-700/20",
  // Change sizes
  small: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "very large": "bg-red-500/10 text-red-500 border-red-500/20",
  large: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  // Roles
  admin: "bg-red-500/10 text-red-500 border-red-500/20",
  project_manager: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  client: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  // Change types
  addition: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  modification: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  removal: "bg-red-500/10 text-red-500 border-red-500/20",
  refactor: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  optimization: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  // Priority
  very_high: "bg-red-500/10 text-red-500 border-red-500/20",
};

export function StatusBadge({ status }: { status: string }) {
  const key = (status || "").toLowerCase().replace(/ /g, "_");
  const cls =
    VARIANTS[key] || "bg-gray-500/10 text-gray-400 border-gray-500/20";
  const label = (status || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}
