/**
 * ImpactSensei v5.0 - Team Management (PM/Admin)
 * Assign clients to projects, manage permissions
 */
import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfirmationModal } from "@/components/common/ConfirmationModal";
import { Users, UserPlus, Trash2, Search } from "lucide-react";

export default function TeamManagement() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<unknown>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [addUserId, setAddUserId] = useState<number | null>(null);
  const [addRole, setAddRole] = useState("viewer");
  const [removeId, setRemoveId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    api
      .getProjects()
      .then(setProjects)
      .catch(() => {});
  }, []);

  const loadProject = async (p: unknown) => {
    setSelectedProject(p);
    const [m, users] = await Promise.all([
      api.getProjectMembers(p.id),
      api.getAdminUsers({ role: "client", limit: 100 }),
    ]);
    setMembers(m);
    setAvailableUsers(users.users || []);
  };

  const handleAdd = async () => {
    if (!addUserId || !selectedProject) return;
    try {
      await api.addProjectMember(selectedProject.id, {
        user_id: addUserId,
        role: addRole,
      });
      toast.success("Member added");
      setShowAdd(false);
      loadProject(selectedProject);
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  const handleRemove = async () => {
    if (!removeId || !selectedProject) return;
    const member = members.find((m) => m.id === removeId);
    try {
      await api.removeProjectMember(selectedProject.id, member.user_id);
      toast.success("Member removed");
      setRemoveId(null);
      loadProject(selectedProject);
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  const nonMembers = availableUsers.filter(
    (u) => !members.some((m) => m.user_id === u.id),
  );
  const filtered = search
    ? nonMembers.filter(
        (u) =>
          u.full_name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()),
      )
    : nonMembers;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Team Management
        </h1>
        <p className="text-muted-foreground">
          Assign clients to projects and manage their permissions
        </p>
      </div>

      {/* Project Selector */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          Select Project
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => loadProject(p)}
              className={`rounded-xl border p-3 text-left text-sm transition-all ${selectedProject?.id === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
            >
              <div className="font-medium truncate">{p.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {p.members_count} members
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedProject && (
        <>
          <div className="rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h2 className="font-semibold">
                  {selectedProject.name} — Team Members
                </h2>
                <p className="text-xs text-muted-foreground">
                  {members.length} members assigned
                </p>
              </div>
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <UserPlus className="h-4 w-4" /> Assign Client
              </button>
            </div>
            <div className="divide-y divide-border">
              {members.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No team members yet. Click "Assign Client" to get started.
                </p>
              ) : (
                members.map((m: unknown) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                        {m.full_name?.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{m.full_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={m.role} />
                      <button
                        onClick={() => setRemoveId(m.id)}
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Assign Modal */}
          {showAdd && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAdd(false)}
            >
              <div
                className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-scale-in"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-lg font-bold mb-4">
                  Assign Client to {selectedProject.name}
                </h2>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search clients..."
                    className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm focus:border-primary outline-none"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto space-y-1 mb-4">
                  {filtered.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setAddUserId(u.id)}
                      className={`w-full flex items-center justify-between rounded-xl p-3 text-sm text-left transition-all ${addUserId === u.id ? "bg-primary/10 border border-primary" : "hover:bg-accent"}`}
                    >
                      <div>
                        <div className="font-medium">{u.full_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {u.email}
                        </div>
                      </div>
                      {addUserId === u.id && (
                        <div className="h-4 w-4 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      No available clients found
                    </p>
                  )}
                </div>
                <div className="mb-4">
                  <label className="text-sm font-medium block mb-1">Role</label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
                  >
                    <option value="viewer">Viewer (read only)</option>
                    <option value="contributor">
                      Contributor (submit changes)
                    </option>
                    <option value="lead">Lead (full project access)</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowAdd(false)}
                    className="rounded-xl border px-4 py-2 text-sm hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={!addUserId}
                    className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    Assign
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmationModal
        isOpen={!!removeId}
        title="Remove Member"
        message="This will remove the client's access to the project."
        onConfirm={handleRemove}
        onCancel={() => setRemoveId(null)}
        confirmText="Remove"
      />
    </div>
  );
}
