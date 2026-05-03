/**
 * ImpactSensei v5.0 - Currency Store
 * Supports INR, USD, EUR, GBP with live exchange rates
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CurrencyCode = "INR" | "USD" | "EUR" | "GBP" | "CAD" | "AUD";

const SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "C$",
  AUD: "A$",
  SGD: "S$",
  JPY: "¥",
};

// Fallback rates (USD base)
const FALLBACK: Record<string, number> = {
  USD: 1.0,
  INR: 83.5,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.35,
  AUD: 1.52,
  SGD: 1.34,
  JPY: 150.2,
};

interface CurrencyState {
  currency: CurrencyCode;
  rates: Record<string, number>;
  lastUpdated: string | null;
  isLoading: boolean;

  setCurrency: (currency: CurrencyCode) => void;
  fetchExchangeRate: () => Promise<void>;

  // Convert amount from INR (project base) to display currency
  convert: (
    amountInProjectCurrency: number,
    projectCurrency?: string,
  ) => number;
  // Format with symbol
  format: (amount: number) => string;
  // Full format with compact notation
  formatCompact: (amount: number) => string;
  // Symbol only
  symbol: () => string;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: "INR",
      rates: FALLBACK,
      lastUpdated: null,
      isLoading: false,

      setCurrency: (currency) => set({ currency }),

      fetchExchangeRate: async () => {
        set({ isLoading: true });
        try {
          // Try our own backend first (it caches live rates)
          const resp = await fetch("/api/settings/public");
          if (resp.ok) {
            const data = await resp.json();
            if (data.exchange_rates) {
              set({
                rates: { USD: 1.0, ...data.exchange_rates },
                lastUpdated: new Date().toISOString(),
              });
              return;
            }
          }
          // Fallback: direct API call
          const liveResp = await fetch(
            "https://api.exchangerate-api.com/v4/latest/USD",
          );
          if (liveResp.ok) {
            const liveData = await liveResp.json();
            set({
              rates: { USD: 1.0, ...liveData.rates },
              lastUpdated: new Date().toISOString(),
            });
          }
        } catch {
          // Silently fall back to stored rates
        } finally {
          set({ isLoading: false });
        }
      },

      convert: (amount: number, projectCurrency = "INR") => {
        const { currency, rates } = get();
        if (projectCurrency === currency) return amount;
        // Convert to USD first, then to target
        const toUSD = amount / (rates[projectCurrency] || 1);
        return Math.round(toUSD * (rates[currency] || 1) * 100) / 100;
      },

      format: (amount: number) => {
        const { currency } = get();
        const symbol = SYMBOLS[currency] || currency;
        if (currency === "JPY")
          return `${symbol}${Math.round(amount).toLocaleString()}`;
        return `${symbol}${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      },

      formatCompact: (amount: number) => {
        const { currency } = get();
        const symbol = SYMBOLS[currency] || currency;
        const abs = Math.abs(amount);
        if (currency === "INR") {
          if (abs >= 1_00_00_000)
            return `${symbol}${(amount / 1_00_00_000).toFixed(2)}Cr`;
          if (abs >= 1_00_000)
            return `${symbol}${(amount / 1_00_000).toFixed(2)}L`;
          if (abs >= 1_000) return `${symbol}${(amount / 1_000).toFixed(1)}K`;
        } else {
          if (abs >= 1_000_000)
            return `${symbol}${(amount / 1_000_000).toFixed(2)}M`;
          if (abs >= 1_000) return `${symbol}${(amount / 1_000).toFixed(1)}K`;
        }
        return `${symbol}${amount.toFixed(2)}`;
      },

      symbol: () => SYMBOLS[get().currency] || get().currency,
    }),
    {
      name: "impactsensei-currency-v5",
      partialize: (state) => ({
        currency: state.currency,
        rates: state.rates,
        lastUpdated: state.lastUpdated,
      }),
    },
  ),
);
