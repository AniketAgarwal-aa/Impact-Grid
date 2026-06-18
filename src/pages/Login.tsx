/**
 * ImpactSensei — Login Page
 * Role-based redirect: admin → /admin | pm → /pm/dashboard | client → /dashboard
 * Supports inline 2FA challenge when server returns requires_2fa: true
 */
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/components/common/Toast";
import { Zap, Eye, EyeOff, LogIn, Shield, ArrowLeft } from "lucide-react";
import { api } from "@/services/api";

function getRoleRedirect(role: string) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "project_manager") return "/pm/dashboard";
  return "/dashboard";
}

function getPreferredRole(pathname: string) {
  if (pathname.includes("/login/admin")) return "admin";
  if (pathname.includes("/login/pm")) return "project_manager";
  if (pathname.includes("/login/client")) return "client";
  return "auto";
}

export default function Login() {
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [tfaCode, setTfaCode] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  // Email verification (OTP)
  const [verifyMode, setVerifyMode] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [resending, setResending] = useState(false);

  // 2FA challenge
  const [tfaMode, setTfaMode] = useState(false);
  const [pendingTokens, setPendingTokens] = useState<{
    access_token: string;
    refresh_token: string;
    user: unknown;
  } | null>(null);

  const { isLoading, error, clearError, setToken } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const preferredRole = getPreferredRole(location.pathname);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    clearError();
    setSubmitting(true);
    try {
      const data = await api.login(email, password, rememberMe, tfaCode || undefined);
      setToken(data.access_token, data.refresh_token, data.user);
      localStorage.setItem("remember_me", rememberMe ? "true" : "false");
      toast.success(`Welcome back, ${data.user.full_name?.split(" ")[0]}! 👋`);
      navigate(getRoleRedirect(data.user.role));
    } catch (err: unknown) {
      const msg = err?.message || "Login failed";
      // If email is not verified, show inline OTP verification UI
      if (
        /verify|verification|not verified/i.test(msg) ||
        /Email not verified/i.test(msg)
      ) {
        setVerifyMode(true);
        toast.warning("Please verify your email first. Enter the 6-digit code sent to your inbox.");
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.verifyEmail(verifyCode);
      toast.success("Email verified. You can sign in now.");
      setVerifyMode(false);
      setVerifyCode("");
    } catch (err: unknown) {
      toast.error(err?.message || "Verification failed");
    }
  };

  const handleResendVerify = async () => {
    if (!email) {
      toast.error("Enter your email first.");
      return;
    }
    if (resending) return;
    setResending(true);
    try {
      await api.resendVerification(email);
      toast.info("Verification code resent. Check your inbox (or server console).");
    } catch (err: unknown) {
      toast.error(err?.message || "Could not resend code");
    } finally {
      setResending(false);
    }
  };

  const handleTfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingTokens) return;
    try {
      localStorage.setItem("access_token", pendingTokens.access_token);
      const result = await api.verify2FA(tfaCode);
      setToken(
        result?.access_token || pendingTokens.access_token,
        result?.refresh_token || pendingTokens.refresh_token,
        pendingTokens.user,
      );
      toast.success("2FA verified! Welcome back 🔐");
      navigate(getRoleRedirect(pendingTokens.user.role));
    } catch {
      toast.error("Invalid 2FA code. Please try again.");
      setTfaCode("");
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.forgotPassword(forgotEmail);
      setForgotSent(true);
      toast.info("If the email exists, a 6-digit reset code was sent (check console if SMTP not configured).");
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 p-12">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative max-w-md text-white z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-xl border border-white/20">
              <Zap className="h-8 w-8" />
            </div>
            <span className="text-3xl font-extrabold tracking-tight">Impact Grid</span>
          </div>
          <h2 className="text-5xl font-extrabold mb-4 leading-tight">
            Predict.<br />Analyze.<br />Decide.
          </h2>
          <p className="text-lg text-white/75 leading-relaxed">
            Enterprise-grade requirement change impact simulation. Know the cost,
            time, effort, and risk before you commit.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-3">
            {[
              ["33 DB Tables", "Complete data model"],
              ["80+ Endpoints", "Full REST API"],
              ["Real-time WS", "Live collaboration"],
              ["Risk Analysis", "Impact forecasting"],
            ].map(([title, sub]) => (
              <div key={title} className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 p-4">
                <div className="font-bold text-sm">{title}</div>
                <div className="text-xs text-white/60 mt-0.5">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold gradient-text">ImpactSensei</span>
          </div>

          {/* ── 2FA Challenge ── */}
          {tfaMode ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-5 rounded-2xl border border-primary/20 bg-primary/5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Two-Factor Auth</h1>
                  <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app</p>
                </div>
              </div>
              <form onSubmit={handleTfaSubmit} className="space-y-4">
                <input
                  id="tfa-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={tfaCode}
                  onChange={(e) => setTfaCode(e.target.value.replace(/\D/g, ""))}
                  required
                  autoFocus
                  className="w-full rounded-xl border border-border bg-background px-4 py-4 text-center text-3xl font-mono tracking-[0.6em] focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="000000"
                />
                <button
                  id="tfa-submit"
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  <Shield className="h-4 w-4" /> Verify &amp; Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setTfaMode(false); setPendingTokens(null); setTfaCode(""); }}
                  className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3 w-3" /> Back to login
                </button>
              </form>
            </div>

          /* ── Email Verification (OTP) ── */
          ) : verifyMode ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 shrink-0">
                  <Shield className="h-7 w-7 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Verify Email</h1>
                  <p className="text-sm text-muted-foreground">
                    Enter the 6-digit code sent to <span className="font-medium">{email || "your email"}</span>
                  </p>
                </div>
              </div>
              <form onSubmit={handleVerifyEmail} className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                  required
                  autoFocus
                  className="w-full rounded-xl border border-border bg-background px-4 py-4 text-center text-3xl font-mono tracking-[0.6em] focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="000000"
                />
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Verify
                </button>
                <button
                  type="button"
                  disabled={resending}
                  onClick={handleResendVerify}
                  className="w-full rounded-xl border border-border py-3 text-sm font-semibold hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {resending ? "Resending…" : "Resend Code"}
                </button>
                <button
                  type="button"
                  onClick={() => { setVerifyMode(false); setVerifyCode(""); }}
                  className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3 w-3" /> Back to login
                </button>
              </form>
            </div>

          /* ── Forgot Password ── */
          ) : forgotMode ? (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold mb-1">Reset Password</h1>
                <p className="text-sm text-muted-foreground">Enter your email to receive a reset link.</p>
              </div>
              {forgotSent ? (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-5 text-center space-y-1">
                  <div className="text-2xl">📧</div>
                  <p className="text-emerald-600 font-semibold text-sm">Reset link sent!</p>
                  <p className="text-xs text-muted-foreground">Check your inbox (or the server console in dev mode)</p>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Email</label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="your@email.com"
                    />
                  </div>
                  <button type="submit" className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                    Send Reset Link
                  </button>
                </form>
              )}
              <button
                type="button"
                onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(""); }}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3 w-3" /> Back to login
              </button>
            </div>

          /* ── Main Login ── */
          ) : (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold mb-1">Sign In</h1>
                <p className="text-sm text-muted-foreground">Enter your credentials to access your dashboard.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email</label>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Password</label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-12 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    <span className="text-muted-foreground">Remember me</span>
                  </label>
                  <button type="button" onClick={() => setForgotMode(true)} className="text-sm text-primary hover:underline">
                    Forgot password?
                  </button>
                </div>

                {error && (
                  <p className="text-sm text-red-500 bg-red-500/10 rounded-xl px-3 py-2.5 border border-red-500/20">
                    {error}
                  </p>
                )}

                <button
                  id="login-submit"
                  type="submit"
                  disabled={submitting || isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
                >
                  {submitting || isLoading
                    ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    : <><LogIn className="h-4 w-4" /> Sign In</>
                  }
                </button>
              </form>



              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  to="/login/admin"
                  className={`rounded-lg border px-3 py-2 text-center transition-colors ${preferredRole === "admin" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}
                >
                  Admin Login
                </Link>
                <Link
                  to="/login/pm"
                  className={`rounded-lg border px-3 py-2 text-center transition-colors ${preferredRole === "project_manager" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}
                >
                  PM Login
                </Link>
                <Link
                  to="/login/client"
                  className={`col-span-2 rounded-lg border px-3 py-2 text-center transition-colors ${preferredRole === "client" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}
                >
                  Client Login
                </Link>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary font-medium hover:underline">Sign up</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
