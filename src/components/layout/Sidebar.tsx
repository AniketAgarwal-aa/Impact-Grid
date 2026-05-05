/**
 * ImpactSensei v5.0 - Role-Based Sidebar
 * Admin | Project Manager | Client — completely separate nav sections
 */
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useThemeStore } from "@/stores/themeStore";
import { cn } from "@/lib/utils";
import {
  Zap,
  LayoutDashboard,
  FolderKanban,
  PlusCircle,
  BarChart3,
  GitCompare,
  FileText,
  User,
  ChevronLeft,
  ChevronRight,
  Shield,
  Users,
  Settings,
  ScrollText,
  Building2,
  CheckSquare,
  UsersRound,
  Files,
  Bell,
  LogOut,
  TrendingUp,
  Plug,
  KeyRound,
} from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/common/Toast";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
}

// CLIENT navigation
const CLIENT_NAV: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "My Projects", path: "/projects", icon: FolderKanban },
  { label: "New Analysis", path: "/new-analysis", icon: PlusCircle },
  { label: "Scenarios", path: "/scenarios", icon: GitCompare },
  { label: "Compare", path: "/compare", icon: BarChart3 },
  { label: "Reports", path: "/reports", icon: FileText },
  { label: "Analytics", path: "/analytics", icon: TrendingUp },
  { label: "Notifications", path: "/notifications", icon: Bell },
];

// PROJECT MANAGER navigation
const PM_NAV: NavItem[] = [
  { label: "PM Dashboard", path: "/pm/dashboard", icon: LayoutDashboard },
  { label: "Projects", path: "/projects", icon: FolderKanban },
  { label: "Approvals", path: "/pm/approvals", icon: CheckSquare },
  { label: "Team", path: "/pm/team", icon: UsersRound },
  { label: "New Analysis", path: "/new-analysis", icon: PlusCircle },
  { label: "Scenarios", path: "/scenarios", icon: GitCompare },
  { label: "Compare", path: "/compare", icon: BarChart3 },
  { label: "Templates", path: "/pm/templates", icon: Files },
  { label: "Reports", path: "/reports", icon: FileText },
  { label: "Analytics", path: "/analytics", icon: TrendingUp },
  { label: "Integrations", path: "/pm/integrations", icon: Plug },
  { label: "Notifications", path: "/notifications", icon: Bell },
];

// ADMIN navigation
const ADMIN_NAV: NavItem[] = [
  { label: "Admin Dashboard", path: "/admin/dashboard", icon: Shield },
  { label: "Projects", path: "/projects", icon: FolderKanban },
  { label: "PM Dashboard", path: "/pm/dashboard", icon: LayoutDashboard },
  { label: "Approvals", path: "/pm/approvals", icon: CheckSquare },
  { label: "User Management", path: "/admin/users", icon: Users },
  { label: "Companies", path: "/admin/companies", icon: Building2 },
  { label: "Security", path: "/admin/security", icon: KeyRound },
  { label: "New Analysis", path: "/new-analysis", icon: PlusCircle },
  { label: "Templates", path: "/pm/templates", icon: Files },
  { label: "Analytics", path: "/analytics", icon: TrendingUp },
  { label: "Integrations", path: "/admin/integrations", icon: Plug },
  { label: "System Settings", path: "/admin/settings", icon: Settings },
  { label: "Audit Logs", path: "/admin/audit", icon: ScrollText },
  { label: "Notifications", path: "/notifications", icon: Bell },
];

const ROLE_CONFIG = {
  admin: {
    nav: ADMIN_NAV,
    label: "Administrator",
    color: "from-red-500 to-orange-500",
    badge: "ADMIN",
  },
  project_manager: {
    nav: PM_NAV,
    label: "Project Manager",
    color: "from-purple-500 to-indigo-500",
    badge: "PM",
  },
  client: {
    nav: CLIENT_NAV,
    label: "Client",
    color: "from-indigo-500 to-blue-500",
    badge: "CLIENT",
  },
};

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const role = user?.role || "client";
  const config =
    ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.client;

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out");
    navigate("/login");
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header / Logo */}
      <div className="flex items-center gap-3 border-b border-border p-4 h-16">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br",
            config.color,
          )}
        >
          <Zap className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-bold gradient-text truncate">
              ImpactSensei
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {config.label}
            </div>
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-md hover:bg-accent transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1">
        {/* Role badge */}
        {!collapsed && (
          <div
            className={cn(
              "mb-3 rounded-lg px-3 py-1.5 text-center text-xs font-bold text-white bg-gradient-to-r",
              config.color,
            )}
          >
            {config.badge}
          </div>
        )}

        {config.nav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
            {!collapsed && item.badge && (
              <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom — User Info + Logout */}
      <div className="border-t border-border p-3 space-y-1">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )
          }
        >
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              className="h-7 w-7 rounded-full shrink-0 object-cover"
              alt=""
            />
          ) : (
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white bg-gradient-to-br",
                config.color,
              )}
            >
              {user?.full_name?.charAt(0) || "U"}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">
                {user?.full_name}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {user?.email}
              </div>
            </div>
          )}
        </NavLink>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
