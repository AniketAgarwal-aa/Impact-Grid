import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface ImpactCardProps {
  label: string;
  value: number | string; // allow number for formatting
  subtext?: string;
  subtextColor?: string;
  icon?: LucideIcon;
  className?: string;
  isCurrency?: boolean; // NEW: flag to format as ₹
}

// Format cost as Rupees
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const ImpactCard = ({
  label,
  value,
  subtext,
  subtextColor,
  icon: Icon,
  className,
  isCurrency = false,
}: ImpactCardProps) => {
  const displayValue =
    isCurrency && typeof value === "number" ? formatCurrency(value) : value;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-5 relative overflow-hidden",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1 text-card-foreground">
            {displayValue}
          </p>
          {subtext && (
            <p
              className={cn(
                "text-xs mt-1 font-medium",
                subtextColor || "text-muted-foreground",
              )}
            >
              {subtext}
            </p>
          )}
        </div>
        {Icon && <Icon className="h-8 w-8 text-muted-foreground/30" />}
      </div>
    </div>
  );
};
