import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

export const CurrencyToggle = ({ className }: { className?: string }) => {
  const { currency, setCurrency, rate } = useCurrency();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex rounded-lg border border-border overflow-hidden text-sm">
        <button
          onClick={() => setCurrency("USD")}
          className={cn(
            "px-3 py-1.5 font-medium transition-colors",
            currency === "USD"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          $ USD
        </button>
        <button
          onClick={() => setCurrency("INR")}
          className={cn(
            "px-3 py-1.5 font-medium transition-colors",
            currency === "INR"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          ₹ INR
        </button>
      </div>
      <span className="text-xs text-muted-foreground">
        1 USD = ₹{rate.toFixed(1)}
      </span>
    </div>
  );
};
