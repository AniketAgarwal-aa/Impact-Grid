/**
 * ImpactSensei - Landing Page
 * Public hero page with features and CTA
 */
import { Link } from "react-router-dom";
import {
  Zap,
  BarChart3,
  Shield,
  GitCompare,
  ArrowRight,
  UserCog,
  BriefcaseBusiness,
  UserRound,
} from "lucide-react";
import { useThemeStore } from "@/stores/themeStore";
import { Sun, Moon } from "lucide-react";

export default function Landing() {
  const { theme, toggleTheme } = useThemeStore();

  const features = [
    {
      icon: Zap,
      title: "Instant Impact Analysis",
      desc: "Get real-time predictions on how changes affect your project's time, cost, effort, and risk.",
    },
    {
      icon: BarChart3,
      title: "Visual Reports",
      desc: "Beautiful charts and exportable reports in PDF, CSV, and JSON formats.",
    },
    {
      icon: GitCompare,
      title: "Scenario Comparison",
      desc: "Save and compare multiple scenarios side-by-side to find the best path forward.",
    },
    {
      icon: Shield,
      title: "Role-Based Access",
      desc: "Granular permissions for Users, Project Managers, and Admins with full audit trails.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-border/50 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">ImpactSensei</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 hover:bg-accent transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          <Link
            to="/login"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-20 md:py-32 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-40 right-1/4 h-60 w-60 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-primary font-medium">
              v3.0 — Enterprise-Grade Impact Prediction
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight">
            Master Your Project
            <span className="block gradient-text mt-2">Changes</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            AI-powered impact prediction that helps you understand how
            requirement changes affect your project's timeline, budget, effort,
            and risk — before you commit.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
            >
              Start Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 rounded-xl border border-border px-8 py-3.5 text-base font-semibold hover:bg-accent transition-colors"
            >
              Login to Dashboard
            </Link>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3 text-left">
            <Link
              to="/login/admin"
              className="rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur transition-all hover:-translate-y-1 hover:border-primary/40"
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <UserCog className="h-4 w-4 text-primary" /> Admin Portal
              </div>
              <p className="text-xs text-muted-foreground">Organization control, users, security, audit</p>
            </Link>
            <Link
              to="/login/pm"
              className="rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur transition-all hover:-translate-y-1 hover:border-primary/40"
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <BriefcaseBusiness className="h-4 w-4 text-primary" /> PM Portal
              </div>
              <p className="text-xs text-muted-foreground">Approvals, sprints, team planning, delivery</p>
            </Link>
            <Link
              to="/login/client"
              className="rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur transition-all hover:-translate-y-1 hover:border-primary/40"
            >
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <UserRound className="h-4 w-4 text-primary" /> Client Portal
              </div>
              <p className="text-xs text-muted-foreground">My projects, analyses, comparisons, reports</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border/50 px-6 py-20 bg-card/50">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold mb-4">
            Why ImpactSensei?
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Enterprise-grade tools that give your team the confidence to make
            changes.
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <div
                key={i}
                className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            ["4", "Impact Metrics"],
            ["100%", "Offline Ready"],
            ["3", "User Roles"],
            ["∞", "Projects"],
          ].map(([n, l], i) => (
            <div key={i}>
              <div className="text-4xl font-bold gradient-text">{n}</div>
              <div className="mt-1 text-sm text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-8 text-center text-sm text-muted-foreground">
        <p>
          © 2024 ImpactSensei v3.0.0 — Built for enterprise project management
        </p>
      </footer>
    </div>
  );
}
