import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";
import { Save, Settings } from "lucide-react";

export default function SystemSettings() {
  const [settings, setSettings] = useState<any[]>([]);
  const [editing, setEditing] = useState<Record<string, string>>({});

  useEffect(() => {
    api
      .getSettings()
      .then(setSettings)
      .catch(() => {});
  }, []);

  const handleSave = async (key: string) => {
    try {
      await api.updateSetting(key, editing[key]);
      toast.success(`Setting '${key}' updated`);
      setEditing((e) => {
        const n = { ...e };
        delete n[key];
        return n;
      });
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  const categories = [...new Set(settings.map((s) => s.category))];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" /> System Settings
      </h1>
      {categories.map((cat) => (
        <div key={cat} className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="font-semibold capitalize">{cat}</h2>
          </div>
          <div className="divide-y divide-border/50">
            {settings
              .filter((s) => s.category === cat)
              .map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">{s.key}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.description}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={
                        editing[s.key] !== undefined ? editing[s.key] : s.value
                      }
                      onChange={(e) =>
                        setEditing({ ...editing, [s.key]: e.target.value })
                      }
                      className="w-48 rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:border-primary outline-none"
                    />
                    {editing[s.key] !== undefined && (
                      <button
                        onClick={() => handleSave(s.key)}
                        className="rounded-lg bg-primary p-1.5 text-primary-foreground hover:bg-primary/90"
                      >
                        <Save className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
