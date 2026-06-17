import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/common/Toast";
import { Zap, Eye, EyeOff, KeyRound, ArrowLeft } from "lucide-react";
import { api } from "@/services/api";

export default function ResetPassword() {
  const [step, setStep] = useState<"otp" | "password">("otp");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.forgotPassword(email);
      toast.info("6-digit reset code sent (check console if SMTP not configured).");
      setStep("password");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to send code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setIsLoading(true);
    try {
      await api.resetPassword({ token: otp, new_password: password });
      toast.success("Password reset! You can log in now.");
      navigate("/login");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Reset Password</h1>
            <p className="text-sm text-muted-foreground">Impact Grid</p>
          </div>
        </div>

        {step === "otp" ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                placeholder="you@company.com"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Send 6-digit code
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Reset code (6 digits)</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                maxLength={6}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary tracking-widest text-center text-lg"
                placeholder="000000"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">New password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-12 text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Confirm password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" /> Reset password
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => navigate("/login")}
          className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to login
        </button>
      </div>
    </div>
  );
}
