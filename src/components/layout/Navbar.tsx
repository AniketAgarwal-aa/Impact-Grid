/**
 * Impact Grid - Navbar
 */
import { useAuthStore } from "@/stores/authStore";
import { useCurrencyStore, CurrencyCode } from "@/stores/currencyStore";
import { useThemeStore } from "@/stores/themeStore";
import { useNotificationStore } from "@/stores/notificationStore";
import { Bell, Sun, Moon, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "@/services/api";

const CURRENCIES: CurrencyCode[] = ["INR", "USD"];

export default function Navbar() {
  const { user } = useAuthStore();
  const { currency, setCurrency, symbol } = useCurrencyStore();
  const { theme, toggleTheme } = useThemeStore();
  const { items, setItems } = useNotificationStore();
  const [showCurrency, setShowCurrency] = useState(false);

  useEffect(() => {
    api
      .getNotifications()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [setItems]);

  const unreadCount = items.filter((n) => !n.is_read).length;

  const roleLabel =
    user?.role === "admin"
      ? "Administrator"
      : user?.role === "project_manager"
        ? "Project Manager"
        : "Client";

  const roleBadgeClass =
    user?.role === "admin"
      ? "bg-red-500/10 text-red-500"
      : user?.role === "project_manager"
        ? "bg-purple-500/10 text-purple-500"
        : "bg-blue-500/10 text-blue-500";

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm px-6 gap-4">
      <div className="flex items-center gap-3">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadgeClass}`}
        >
          {roleLabel}
        </span>
        {user?.client_id && (
          <span className="text-xs text-muted-foreground hidden sm:block">
            {user.client_id}
          </span>
        )}
      </div>

      <div className="relative z-50 flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowCurrency(!showCurrency)}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            {symbol()} {currency}
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
          {showCurrency && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowCurrency(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-1 w-28 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
                {CURRENCIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setCurrency(c);
                      setShowCurrency(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors ${currency === c ? "text-primary font-semibold bg-primary/5" : ""}`}
                  >
                    {c === "INR" ? "₹ INR" : "$ USD"}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={toggleTheme}
          className="rounded-xl border border-border p-2 hover:bg-accent transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        <Link
          to="/notifications"
          className="relative rounded-xl border border-border p-2 hover:bg-accent transition-colors"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        <Link
          to="/profile"
          className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 hover:bg-accent transition-colors"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
            {user?.full_name?.charAt(0) || "U"}
          </div>
          <span className="text-sm font-medium hidden sm:block max-w-[120px] truncate">
            {user?.full_name?.split(" ")[0]}
          </span>
        </Link>
      </div>
    </header>
  );
}
