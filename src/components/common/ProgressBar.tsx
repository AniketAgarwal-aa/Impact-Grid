/** Progress bar for risk scores */
interface Props {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  colorByValue?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  colorByValue = true,
  className = "",
}: Props) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color = colorByValue
    ? pct >= 80
      ? "bg-red-500"
      : pct >= 60
        ? "bg-orange-500"
        : pct >= 40
          ? "bg-amber-500"
          : "bg-emerald-500"
    : "bg-primary";

  return (
    <div className={`space-y-1 ${className}`}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showValue && <span className="font-semibold">{pct}/100</span>}
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-accent overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
