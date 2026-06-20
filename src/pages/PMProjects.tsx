import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";
import { FolderKanban, TrendingUp, CalendarDays, BarChart2 } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export default function PMProjects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [roadmap, setRoadmap] = useState<unknown>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [projData, roadmapData] = await Promise.all([
        api.getProjects(),
        user?.company_id ? api.getRoadmap(user.company_id) : Promise.resolve(null)
      ]);
      setProjects(projData);
      setRoadmap(roadmapData);
    } catch (err: unknown) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FolderKanban className="h-6 w-6 text-primary" /> Company Projects
        </h1>
        <p className="text-sm text-muted-foreground">Manage all projects within your company and view the quarterly roadmap.</p>
      </div>

      {/* Roadmap View */}
      {roadmap && roadmap.quarters && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <CalendarDays className="h-5 w-5 text-emerald-500" /> Quarterly Roadmap
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {roadmap.quarters.map((q: unknown) => (
              <div key={q.quarter} className="rounded-xl border border-border bg-background p-4">
                <h3 className="font-semibold text-sm mb-3">{q.quarter}</h3>
                <div className="space-y-3">
                  {q.projects.map((p: unknown) => (
                    <div key={p.project_id} className="text-sm border-l-2 border-primary pl-2">
                      <p className="font-medium truncate">{p.project_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={p.status} />
                        <span className="text-xs text-muted-foreground">{p.progress}% done</span>
                      </div>
                    </div>
                  ))}
                  {q.projects.length === 0 && <p className="text-xs text-muted-foreground italic">No projects</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects List */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center bg-accent/30">
          <h2 className="font-semibold">All Projects</h2>
          <Link to="/projects" className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90">
            Create Project
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-background">
              <tr>
                <th className="px-6 py-3">Project Name</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Stage</th>
                <th className="px-6 py-3">Priority</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No projects found
                  </td>
                </tr>
              )}
              {projects.map(p => (
                <tr key={p.id} className="hover:bg-accent/30">
                  <td className="px-6 py-4 font-medium text-foreground">{p.name}</td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                  <td className="px-6 py-4 capitalize">{p.stage}</td>
                  <td className="px-6 py-4 capitalize">{p.priority}</td>
                  <td className="px-6 py-4">
                    <Link to={`/projects/${p.id}`} className="text-primary hover:underline font-medium">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
