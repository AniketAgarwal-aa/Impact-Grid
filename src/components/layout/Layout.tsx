/**
 * ImpactSensei v5.0 - Main Layout
 */
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useEffect } from "react";
import { useCurrencyStore } from "@/stores/currencyStore";
import { useThemeStore } from "@/stores/themeStore";

export default function Layout() {
  const { fetchExchangeRate } = useCurrencyStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    fetchExchangeRate();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
