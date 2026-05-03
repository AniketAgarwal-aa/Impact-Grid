import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";
import { User, Lock, Save } from "lucide-react";

export default function Profile() {
  const { user, updateProfile } = useAuthStore();
  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    department: user?.department || "",
    designation: user?.designation || "",
    phone: user?.phone || "",
  });
  const [pwForm, setPwForm] = useState({
    current_password: "",
    new_password: "",
    confirm: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success("Profile updated");
    } catch (err: unknown) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) {
      toast.error("Passwords don't match");
      return;
    }
    try {
      await api.changePassword({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      toast.success("Password changed");
      setPwForm({ current_password: "", new_password: "", confirm: "" });
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
            {user?.full_name?.charAt(0)}
          </div>
          <div>
            <div className="text-lg font-semibold">{user?.full_name}</div>
            <div className="text-sm text-muted-foreground">
              {user?.email} ·{" "}
              <span className="capitalize">
                {user?.role?.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">
                Department
              </label>
              <input
                type="text"
                value={form.department}
                onChange={(e) =>
                  setForm({ ...form, department: e.target.value })
                }
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">
                Designation
              </label>
              <input
                type="text"
                value={form.designation}
                onChange={(e) =>
                  setForm({ ...form, designation: e.target.value })
                }
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> Save
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Lock className="h-4 w-4" /> Change Password
        </h2>
        <form onSubmit={handlePassword} className="space-y-4">
          <input
            type="password"
            value={pwForm.current_password}
            onChange={(e) =>
              setPwForm({ ...pwForm, current_password: e.target.value })
            }
            placeholder="Current Password"
            required
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
          />
          <input
            type="password"
            value={pwForm.new_password}
            onChange={(e) =>
              setPwForm({ ...pwForm, new_password: e.target.value })
            }
            placeholder="New Password (min 8 chars)"
            required
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
          />
          <input
            type="password"
            value={pwForm.confirm}
            onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
            placeholder="Confirm New Password"
            required
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Change Password
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" /> Two-Factor Authentication (2FA)
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Add an extra layer of security to your account using TOTP.</p>
          </div>
          {user?.is_2fa_enabled ? (
            <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs font-semibold">Enabled</span>
          ) : (
            <span className="bg-muted text-muted-foreground px-3 py-1 rounded-full text-xs font-semibold">Disabled</span>
          )}
        </div>
        
        <div className="pt-2">
          {user?.is_2fa_enabled ? (
            <div className="flex gap-4">
              <button 
                onClick={async () => {
                  if(!confirm('Disable 2FA?')) return;
                  try {
                    const code = prompt("Enter current 2FA code to disable:");
                    if(!code) return;
                    await api.disable2FA(code);
                    toast.success("2FA Disabled");
                    window.location.reload();
                  } catch(e: unknown) { toast.error(e.message) }
                }}
                className="px-4 py-2 border border-red-500 text-red-500 rounded-xl text-sm font-medium hover:bg-red-500/10"
              >
                Disable 2FA
              </button>
              <button
                onClick={() => window.location.href = '/backup-codes'}
                className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-accent"
              >
                View Backup Codes
              </button>
            </div>
          ) : (
            <button 
              onClick={async () => {
                try {
                  const data = await api.setup2FA();
                  const code = prompt(`Scan this secret in your authenticator app: ${data.secret}\n\nThen enter the 6-digit code here to verify:`);
                  if(!code) return;
                  await api.verify2FA(code);
                  toast.success("2FA Enabled successfully!");
                  window.location.href = '/backup-codes';
                } catch(e: unknown) { toast.error(e.message) }
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90"
            >
              Setup 2FA
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
