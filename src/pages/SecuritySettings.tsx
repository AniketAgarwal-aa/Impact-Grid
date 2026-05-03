import { useEffect, useState } from "react";
import { Shield, Plus, Trash2, Key, Server, Lock } from "lucide-react";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";

export default function SecuritySettings() {
  const [ips, setIps] = useState<any[]>([]);
  const [ipForm, setIpForm] = useState({ ip_range: "", description: "" });
  const [encStatus, setEncStatus] = useState<unknown>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [ipsData, encData] = await Promise.all([
        api.getIPWhitelist(),
        api.getEncryptionStatus(),
      ]);
      setIps(Array.isArray(ipsData) ? ipsData : []);
      setEncStatus(encData);
    } catch {
      // ignore
    }
  };

  const handleAddIP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ipForm.ip_range) return;
    try {
      await api.addIPWhitelist(ipForm);
      toast.success("IP added to whitelist");
      setIpForm({ ip_range: "", description: "" });
      load();
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  const handleRemoveIP = async (id: number) => {
    try {
      await api.removeIPWhitelist(id);
      toast.success("IP removed");
      load();
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  const handleRotateKey = async () => {
    if (!confirm("Are you sure? All future encryptions will use the new key.")) return;
    try {
      const res = await api.rotateEncryptionKey();
      toast.success("Key rotated successfully");
      console.log("New key:", res.new_key);
      alert(`New Key (Save to .env): ${res.new_key}`);
      load();
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" /> Security Settings
        </h1>
        <p className="text-sm text-muted-foreground">Manage IP whitelisting, encryption, and global security policies.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* IP Whitelist */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Server className="h-5 w-5 text-blue-500" />
            <h2 className="font-semibold text-lg">IP Whitelist</h2>
          </div>
          <p className="text-xs text-muted-foreground">Restrict API access to specific IP ranges (CIDR notation supported).</p>
          
          <form onSubmit={handleAddIP} className="flex gap-2">
            <input
              type="text"
              placeholder="IP (e.g., 192.168.1.0/24)"
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
              value={ipForm.ip_range}
              onChange={e => setIpForm({ ...ipForm, ip_range: e.target.value })}
              required
            />
            <button type="submit" className="rounded-xl bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
            </button>
          </form>

          <div className="space-y-2 mt-4">
            {ips.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No IPs whitelisted. All IPs allowed.</p>
            ) : (
              ips.map(ip => (
                <div key={ip.id} className="flex items-center justify-between p-3 rounded-xl border border-border">
                  <div>
                    <p className="text-sm font-medium">{ip.ip_range}</p>
                    <p className="text-xs text-muted-foreground">Added by {ip.added_by}</p>
                  </div>
                  <button onClick={() => handleRemoveIP(ip.id)} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Encryption at Rest */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Key className="h-5 w-5 text-emerald-500" />
            <h2 className="font-semibold text-lg">Data Encryption</h2>
          </div>
          <p className="text-xs text-muted-foreground">Sensitive fields are encrypted at rest using AES-256 (Fernet).</p>

          {encStatus && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-accent/50">
                <span className="text-sm">Status</span>
                <span className="text-sm font-medium flex items-center gap-1 text-emerald-500">
                  <Lock className="h-4 w-4" /> Active
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-accent/50">
                <span className="text-sm">Algorithm</span>
                <span className="text-sm font-medium">{encStatus.algorithm}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-accent/50">
                <span className="text-sm">Key Source</span>
                <span className="text-sm font-medium">{encStatus.key_source}</span>
              </div>

              <button 
                onClick={handleRotateKey}
                className="w-full flex justify-center items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm hover:bg-accent mt-4"
              >
                <Key className="h-4 w-4" /> Rotate Encryption Key
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
