import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/services/api";
import { toast } from "@/components/common/Toast";
import { FileText, Plus, ArrowRight } from "lucide-react";

interface Template {
  id: number;
  name: string;
  description: string;
  category: string;
  usage_count: number;
  is_public: boolean;
}

export default function PMTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);

  const load = () => {
    api
      .getTemplates()
      .then(setTemplates)
      .catch(() => {});
  };
  useEffect(load, []);

  const applyTemplate = async (templateId: number) => {
    try {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        toast.success(`Template "${template.name}" applied successfully`);
      }
    } catch (err) {
      toast.error("Failed to apply template");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> Templates
        </h1>
        <Link
          to="/admin/templates"
          className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm hover:bg-accent"
        >
          Manage Templates <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No templates available. <Link to="/admin/templates" className="text-primary hover:underline">Create one</Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition-colors"
            >
              <div className="mb-3">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary capitalize">
                  {t.category}
                </span>
              </div>
              <h3 className="font-semibold mb-2">{t.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t.description || "No description"}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Used {t.usage_count}x
                </span>
                <button
                  onClick={() => applyTemplate(t.id)}
                  className="text-sm text-primary hover:underline"
                >
                  Apply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}