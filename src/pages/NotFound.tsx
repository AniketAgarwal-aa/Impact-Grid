import { Link } from "react-router-dom";
import { Zap, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="text-center max-w-md animate-fade-in">
        <div className="text-8xl font-black gradient-text mb-4">404</div>
        <div className="flex items-center justify-center gap-2 mb-4">
          <Zap className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">ImpactSensei</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
        >
          <Home className="h-4 w-4" /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
