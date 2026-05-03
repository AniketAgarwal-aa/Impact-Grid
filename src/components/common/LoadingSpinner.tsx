/** Loading spinners */
export function PageLoader() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}

export function InlineLoader({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <div
      className={`animate-spin rounded-full border-2 border-current/20 border-t-current ${size === "sm" ? "h-4 w-4" : "h-6 w-6"}`}
    />
  );
}
