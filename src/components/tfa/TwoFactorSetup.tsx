/**
 * TwoFactorSetup — 2FA Management Page Component
 * Google Authenticator compatible TOTP setup with QR code and backup codes.
 */
import { useEffect, useState } from "react";
import { Shield, ShieldCheck, QrCode, Key, Copy, CheckCircle, AlertTriangle } from "lucide-react";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";

interface TFAStatus {
  enabled: boolean;
  backup_codes_remaining: number;
}

interface SetupData {
  secret: string;
  qr_data_url: string;
  provisioning_uri: string;
}

export default function TwoFactorSetup() {
  const [status, setStatus] = useState<TFAStatus | null>(null);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [step, setStep] = useState<"idle" | "scan" | "verify" | "done">("idle");
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disableCode, setDisableCode] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const s = await api.get2FAStatus();
      setStatus(s);
    } catch {
      // ignore
    }
  };

  const handleSetup = async () => {
    setLoading(true);
    try {
      const data = await api.setup2FA();
      setSetupData(data);
      setStep("scan");
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.verify2FA(verifyCode);
      setBackupCodes(res.backup_codes || []);
      setStep("done");
      toast.success("2FA enabled successfully!");
      await loadStatus();
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.disable2FA(disableCode);
      toast.success("2FA disabled");
      setShowDisable(false);
      setDisableCode("");
      setStep("idle");
      setSetupData(null);
      await loadStatus();
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshBackupCodes = async () => {
    setLoading(true);
    try {
      const res = await api.getBackupCodes();
      setBackupCodes(res.backup_codes || []);
      toast.success("New backup codes generated");
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = async () => {
    await navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

  // ── Enabled state ──────────────────────────────────────────────────────────
  if (status?.enabled && step === "idle") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="font-semibold text-emerald-500">2FA is Enabled</p>
            <p className="text-sm text-muted-foreground">
              {status.backup_codes_remaining} backup codes remaining
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleRefreshBackupCodes}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm hover:bg-accent transition-colors"
          >
            <Key className="h-4 w-4" /> Regenerate Backup Codes
          </button>
          <button
            onClick={() => setShowDisable(true)}
            className="flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <AlertTriangle className="h-4 w-4" /> Disable 2FA
          </button>
        </div>

        {backupCodes.length > 0 && (
          <BackupCodesList codes={backupCodes} copied={copied} onCopy={copyBackupCodes} />
        )}

        {showDisable && (
          <form
            onSubmit={handleDisable}
            className="rounded-2xl border border-border bg-card p-5 space-y-3"
          >
            <p className="text-sm font-medium">
              Enter your authenticator code or a backup code to disable 2FA:
            </p>
            <input
              type="text"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              placeholder="6-digit code or backup code"
              maxLength={8}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none font-mono tracking-widest"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDisable(false)}
                className="flex-1 rounded-xl border px-4 py-2 text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                Disable 2FA
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  // ── Setup flow ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {step === "idle" && (
        <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold mb-1">Two-Factor Authentication</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add an extra layer of security. Works with Google Authenticator,
              Authy, and other TOTP apps.
            </p>
            <button
              onClick={handleSetup}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <QrCode className="h-4 w-4" />
              {loading ? "Setting up..." : "Enable 2FA"}
            </button>
          </div>
        </div>
      )}

      {step === "scan" && setupData && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div>
            <h3 className="font-semibold mb-1">Step 1: Scan QR Code</h3>
            <p className="text-sm text-muted-foreground">
              Open your authenticator app and scan the code below.
            </p>
          </div>

          <div className="flex justify-center">
            <div className="rounded-2xl border-4 border-white p-2 shadow-lg">
              <img
                src={setupData.qr_data_url}
                alt="QR Code"
                className="w-48 h-48"
              />
            </div>
          </div>

          <div className="rounded-xl bg-accent/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">Manual entry key:</p>
            <code className="text-sm font-mono break-all">{setupData.secret}</code>
          </div>

          <form onSubmit={handleVerify} className="space-y-3">
            <div>
              <label className="text-sm font-medium block mb-1">
                Step 2: Enter the 6-digit code from your app
              </label>
              <input
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                placeholder="000000"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={verifyCode.length !== 6 || loading}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & Enable"}
            </button>
          </form>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <CheckCircle className="h-6 w-6 text-emerald-500" />
            <div>
              <p className="font-semibold text-emerald-500">2FA Enabled!</p>
              <p className="text-sm text-muted-foreground">
                Save your backup codes — you won't see them again.
              </p>
            </div>
          </div>
          <BackupCodesList codes={backupCodes} copied={copied} onCopy={copyBackupCodes} />
          <button
            onClick={() => {
              setStep("idle");
              loadStatus();
            }}
            className="w-full rounded-xl border border-border py-2 text-sm hover:bg-accent"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

function BackupCodesList({
  codes,
  copied,
  onCopy,
}: {
  codes: string[];
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
          ⚠️ Backup Codes — Save These Now
        </p>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 rounded-lg border border-border px-3 py-1 text-xs hover:bg-accent"
        >
          {copied ? (
            <CheckCircle className="h-3 w-3 text-emerald-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copied ? "Copied!" : "Copy All"}
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {codes.map((code, i) => (
          <code
            key={i}
            className="rounded-lg bg-background border border-border px-3 py-1.5 text-center text-sm font-mono tracking-widest"
          >
            {code}
          </code>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Each code can only be used once. Store them somewhere safe.
      </p>
    </div>
  );
}
