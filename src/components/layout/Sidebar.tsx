/**
 * Impact Grid - Role-Based Sidebar (clean, minimal per role)
 */
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import {
  Zap,
  LayoutDashboard,
  FolderKanban,
  PlusCircle,
  CheckSquare,
  Users,
  Bell,
  User,
  LogOut,
  Shield,
  BarChart3,
} from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/common/Toast";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const CLIENT_NAV: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "My Projects", path: "/projects", icon: FolderKanban },
  { label: "Submit Change", path: "/new-analysis", icon: PlusCircle },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "Profile", path: "/profile", icon: User },
];

const PM_NAV: NavItem[] = [
  { label: "Dashboard", path: "/pm/dashboard", icon: LayoutDashboard },
  { label: "Projects", path: "/projects", icon: FolderKanban },
  { label: "Approvals", path: "/pm/approvals", icon: CheckSquare },
  { label: "Team & Clients", path: "/pm/team", icon: Users },
  { label: "Analytics", path: "/pm/analytics", icon: BarChart3 },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "Profile", path: "/profile", icon: User },
];

const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", path: "/admin/dashboard", icon: Shield },
  { label: "All Projects", path: "/projects", icon: FolderKanban },
  { label: "Approvals", path: "/pm/approvals", icon: CheckSquare },
  { label: "Users", path: "/admin/users", icon: Users },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "Profile", path: "/profile", icon: User },
];

const ROLE_CONFIG = {
  admin: { nav: ADMIN_NAV, label: "Administrator", color: "from-red-500 to-orange-500" },
  project_manager: { nav: PM_NAV, label: "Project Manager", color: "from-purple-500 to-indigo-500" },
  client: { nav: CLIENT_NAV, label: "Client", color: "from-indigo-500 to-blue-500" },
};

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const role = user?.role || "client";
  const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.client;

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out");
    navigate("/login");
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-56",
      )}
    >
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
            <div className="text-sm font-bold truncate">Impact Grid</div>
            <div className="text-xs text-muted-foreground truncate">{config.label}</div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {config.nav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mb-2 w-full rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
        >
          {collapsed ? "→" : "← Collapse"}
        </button>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
