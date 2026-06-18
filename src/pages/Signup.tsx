/**
 * Impact Grid - Signup Page
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/components/common/Toast";
import { api } from "@/services/api";
import { Zap, Eye, EyeOff, UserPlus, CheckCircle } from "lucide-react";

export default function Signup() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    designation: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"register" | "verify">("register");
  const [verifyCode, setVerifyCode] = useState("");
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    try {
      const result = await register({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        designation: form.designation || undefined,
      });
      // Always require email verification
      toast.success(
        "Account created! A 6-digit verification code has been sent to your email.",
      );
      setStep("verify");
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.verifyEmail(verifyCode);
      toast.success("Email verified! You can now login.");
      navigate("/login");
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  const handleResend = async () => {
    try {
      await api.resendVerification(form.email);
      toast.info("Verification code resent.");
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  if (step === "verify") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
          <p className="text-muted-foreground mb-6">
            We sent a 6-digit code to <strong>{form.email}</strong>
          </p>
          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="text"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              maxLength={6}
              placeholder="Enter 6-digit code"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Verify Email
            </button>
          </form>
          <button
            onClick={handleResend}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Resend Code
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-500 p-12">
        <div className="max-w-md text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Zap className="h-7 w-7" />
            </div>
            <span className="text-3xl font-bold">ImpactSensei</span>
          </div>
          <h2 className="text-4xl font-bold mb-4">Get Started</h2>
          <p className="text-lg text-white/80">
            Create your account and start predicting the impact of your project
            changes today.
          </p>
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          <h1 className="text-2xl font-bold mb-2">Create Account</h1>
          <p className="text-muted-foreground mb-6">
            Fill in your details to get started.
          </p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Full Name *
              </label>
              <input
                id="signup-name"
                type="text"
                value={form.full_name}
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="Akash Gupta"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Email *
              </label>
              <input
                id="signup-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Designation
              </label>
              <select
                value={form.designation}
                onChange={(e) =>
                  setForm({ ...form, designation: e.target.value })
                }
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="">Select your role</option>
                <option value="Project Manager">Project Manager</option>
                <option value="Developer">Developer</option>
                <option value="Designer">Designer</option>
                <option value="Business Analyst">Business Analyst</option>
                <option value="QA Engineer">QA Engineer</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Password *
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-12 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Min 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Confirm Password *
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              id="signup-submit"
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4" /> Create Account
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
