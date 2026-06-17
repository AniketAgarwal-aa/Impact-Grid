import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import { Plus, Search, Trash2, ShieldCheck, Mail } from "lucide-react";

import { isProtectedAdmin } from "@/constants/admins";

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    admin: "bg-purple-500/15 text-purple-600 border-purple-500/30",
    project_manager: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    client: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  };
  const labels: Record<string, string> = {
    admin: "Admin",
    project_manager: "Project Manager",
    client: "Client",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${map[role] ?? "bg-muted text-muted-foreground border-border"}`}
    >
      {role === "admin" && <ShieldCheck className="h-3 w-3" />}
      {labels[role] ?? role}
    </span>
  );
}

export default function UserManagement() {

  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteEmail, setDeleteEmail] = useState<string>("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "client",
    department: "",
    designation: "",
    is_verified: true,
  });

  const load = () => {
    api
      .getAdminUsers({ page, search, role: roleFilter })
      .then((d) => {
        setUsers(d.users);
        setTotal(d.total);
      })
      .catch(() => {});
  };
  useEffect(load, [page, search, roleFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    try {
      await api.createAdminUser(form);
      toast.success("User created. Verification email sent.");
      setShowCreate(false);
      setForm({ email: "", password: "", full_name: "", role: "client", department: "", designation: "", is_verified: true });
      load();
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  const handleRoleChange = async (uid: number, targetEmail: string, newRole: string) => {
    if (isProtectedAdmin(targetEmail)) {
      toast.error("Super admin accounts cannot be modified.");
      load();
      return;
    }
    try {
      await api.updateUserRole(uid, newRole);
      toast.success(`Role updated to ${newRole}`);
      load();
    } catch (err: unknown) {
      toast.error((err as Error).message);
      load();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (isProtectedAdmin(deleteEmail)) {
      toast.error("Cannot delete a super admin account.");
      setDeleteId(null);
      return;
    }
    try {
      await api.deleteAdminUser(deleteId);
      toast.success("User deleted");
      setDeleteId(null);
      setDeleteEmail("");
      load();
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  const isRoleLocked = (u: { email: string }) => isProtectedAdmin(u.email);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {total} users
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm focus:border-primary outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
        >
          <option value="">All Roles</option>
          <option value="client">Client</option>
          <option value="project_manager">Project Manager</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-accent/50">
              <th className="p-4 text-left font-semibold">Name</th>
              <th className="p-4 text-left font-semibold">Email</th>
              <th className="p-4 text-left font-semibold">Role</th>
              <th className="p-4 text-left font-semibold">Verified</th>
              <th className="p-4 text-left font-semibold">Status</th>
              <th className="p-4 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-border/50 hover:bg-accent/30"
              >
                <td className="p-4 font-medium">
                  <div className="flex items-center gap-2">
                    {isProtectedAdmin(u.email) && (
                      <ShieldCheck className="h-4 w-4 text-purple-500" title="Super Admin" />
                    )}
                    {u.full_name}
                    {u.client_id && (
                      <span className="text-[10px] text-muted-foreground ml-1">({u.client_id})</span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-muted-foreground">{u.email}</td>
                <td className="p-4">
                  {/* Admin users: show lock badge if current user is not super admin */}
                  {isRoleLocked(u) ? (
                    <RoleBadge role={u.role} />
                  ) : (
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, u.email, e.target.value)}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                    >
                      <option value="client">Client</option>
                      <option value="project_manager">Project Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${u.is_verified ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"}`}>
                    {u.is_verified ? "✓ Verified" : "⚠ Unverified"}
                  </span>
                </td>
                <td className="p-4">
                  <StatusBadge status={u.is_active ? "active" : "archived"} />
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {!isProtectedAdmin(u.email) && (
                      <button
                        onClick={() => { setDeleteId(u.id); setDeleteEmail(u.email); }}
                        className="text-red-500 hover:bg-red-500/10 rounded-lg p-1.5"
                        title="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">
              Page {page} · {total} total
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-accent"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 20 >= total}
                className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40 hover:bg-accent"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Role legend */}
      <div className="rounded-xl border border-border bg-card/50 p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2">ROLE PERMISSIONS</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-purple-600">Admin</span>
              <p className="text-muted-foreground">Full system access. Super admins (admin1/admin2@impactstudio.com) cannot be modified.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-blue-600">Project Manager</span>
              <p className="text-muted-foreground">Creates projects, approves/rejects change requests.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Plus className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-emerald-600">Client</span>
              <p className="text-muted-foreground">Submits change requests for linked projects.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-1">Create User</h2>
            <p className="text-sm text-muted-foreground mb-4">
              User will receive a verification email before they can sign in.
            </p>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
                placeholder="Full Name *"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
              />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                placeholder="Email *"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
              />
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
                placeholder="Password (min 8 characters) *"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
              />
              <div>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
                >
                  <option value="client">Client</option>
                  <option value="project_manager">Project Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="Department (optional)"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary outline-none"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-xl border px-4 py-2 text-sm hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteId}
        title="Delete User"
        message={`This will permanently delete ${deleteEmail}. This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteId(null); setDeleteEmail(""); }}
        confirmText="Delete"
      />
    </div>
  );
}
