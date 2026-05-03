import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";
import { ShieldAlert, Download, Copy, RefreshCw } from "lucide-react";

export default function BackupCodes() {
  const [codes, setCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    try {
      setLoading(true);
      const data = await api.getBackupCodes();
      setCodes(data.codes);
    } catch (err: unknown) {
      toast.error(err.message || "Failed to load backup codes");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codes.join("\n"));
    toast.success("Codes copied to clipboard");
  };

  const downloadCodes = () => {
    const text = `ImpactSensei 2FA Backup Codes\nGenerated: ${new Date().toLocaleString()}\n\n` + codes.join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "impactsensei-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading codes...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-red-500" /> 2FA Backup Codes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Keep these codes safe. You can use them to sign in if you lose access to your authenticator app.
          Each code can only be used once.
        </p>
      </div>

      <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-2xl flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <strong>Warning:</strong> Never share these codes with anyone. 
          ImpactSensei support will never ask for your backup codes.
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          {codes.map((code, idx) => (
            <div key={idx} className="font-mono text-lg tracking-widest text-center py-2 bg-accent/50 rounded-lg">
              {code}
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-center">
          <button 
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-accent"
          >
            <Copy className="h-4 w-4" /> Copy
          </button>
          <button 
            onClick={downloadCodes}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-accent"
          >
            <Download className="h-4 w-4" /> Download
          </button>
        </div>
      </div>
    </div>
  );
}
