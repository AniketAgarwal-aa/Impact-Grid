/**
 * Settings Page v5.1
 * Sections: Profile, Appearance, Two-Factor Auth (2FA), Danger Zone
 */
import { Sun, Moon, Trash2, User, Mail, Shield } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useThemeStore } from "@/stores/themeStore";
import TwoFactorSetup from "@/components/tfa/TwoFactorSetup";

export default function Settings() {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const clearData = () => {
    localStorage.removeItem("impact_analyses");
    localStorage.removeItem("impact_scenarios");
    localStorage.removeItem("impact_activities");
    alert("Local data cleared. Refresh to see changes.");
  };

  return (
    <div className="fade-in max-w-2xl mx-auto space-y-6 p-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Profile */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Profile</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> Name
            </label>
            <input
              value={user?.full_name || ""}
              readOnly
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-muted text-foreground text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" /> Email
            </label>
            <input
              value={user?.email || ""}
              readOnly
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-border bg-muted text-foreground text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                user?.role === "admin"
                  ? "bg-purple-500/10 text-purple-500"
                  : user?.role === "project_manager"
                    ? "bg-blue-500/10 text-blue-500"
                    : "bg-emerald-500/10 text-emerald-500"
              }`}
            >
              {user?.role?.replace("_", " ")}
            </span>
            {user?.is_verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-500">
                ✓ Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold mb-3">Appearance</h2>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-accent transition-colors w-full"
        >
          {theme === "dark" ? (
            <Moon className="h-5 w-5 text-primary" />
          ) : (
            <Sun className="h-5 w-5 text-amber-500" />
          )}
          <div className="text-left">
            <p className="text-sm font-medium">{theme === "dark" ? "Dark Mode" : "Light Mode"}</p>
            <p className="text-xs text-muted-foreground">
              Click to switch to {theme === "dark" ? "light" : "dark"} mode
            </p>
          </div>
        </button>
      </div>

      {/* 2FA */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Two-Factor Authentication</h2>
        </div>
        <TwoFactorSetup />
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
        <h2 className="font-semibold text-red-500 mb-2">Danger Zone</h2>
        <p className="text-sm text-muted-foreground mb-4">
          This will permanently clear all locally cached data.
        </p>
        <button
          onClick={clearData}
          className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
        >
          <Trash2 className="h-4 w-4" /> Clear Local Data
        </button>
      </div>
    </div>
  );
}
