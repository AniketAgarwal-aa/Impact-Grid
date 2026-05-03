/**
 * ActivityHeatmap — GitHub-style contribution calendar.
 * Pure CSS Grid, no external libraries.
 * Props: activities = { "2026-01-15": 3, "2026-01-16": 1, ... }
 */
import { useMemo, useState } from "react";

interface Props {
  activities?: Record<string, number>;
  year?: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

function getIntensity(count: number): string {
  if (count === 0) return "bg-[#ebedf0] dark:bg-[#161b22]";
  if (count === 1) return "bg-[#9be9a8] dark:bg-[#0e4429]";
  if (count <= 3) return "bg-[#40c463] dark:bg-[#006d32]";
  if (count <= 6) return "bg-[#30a14e] dark:bg-[#26a641]";
  return "bg-[#216e39] dark:bg-[#39d353]";
}

function getDatesInYear(year: number): Date[] {
  const dates: Date[] = [];
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d));
  }
  return dates;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function ActivityHeatmap({ activities = {}, year }: Props) {
  const currentYear = year || new Date().getFullYear();
  const [tooltip, setTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  const { weeks, monthLabels } = useMemo(() => {
    const dates = getDatesInYear(currentYear);
    // Pad to start on Sunday
    const firstDow = dates[0].getDay(); // 0 = Sun
    const cells: (Date | null)[] = [
      ...Array(firstDow).fill(null),
      ...dates,
    ];

    // Group into weeks (columns of 7)
    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }

    // Month labels: track when month changes across weeks
    const monthLabels: { month: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, col) => {
      const firstReal = week.find((d) => d !== null);
      if (firstReal && firstReal.getMonth() !== lastMonth) {
        lastMonth = firstReal.getMonth();
        monthLabels.push({ month: MONTHS[lastMonth], col });
      }
    });

    return { weeks, monthLabels };
  }, [currentYear]);

  const totalActivity = Object.values(activities).reduce((a, b) => a + b, 0);
  const activeDays = Object.values(activities).filter((v) => v > 0).length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Activity in {currentYear}</h3>
        <span className="text-xs text-muted-foreground">
          {totalActivity} actions · {activeDays} active days
        </span>
      </div>

      {/* Calendar */}
      <div className="relative overflow-x-auto pb-2">
        {/* Month labels */}
        <div className="flex mb-1 ml-8" style={{ gap: "3px" }}>
          {weeks.map((_, col) => {
            const label = monthLabels.find((m) => m.col === col);
            return (
              <div
                key={col}
                className="text-[10px] text-muted-foreground"
                style={{ width: 12, flexShrink: 0 }}
              >
                {label?.month || ""}
              </div>
            );
          })}
        </div>

        <div className="flex" style={{ gap: "3px" }}>
          {/* Day labels */}
          <div
            className="flex flex-col mr-1"
            style={{ gap: "3px", width: 24 }}
          >
            {DAYS.map((d, i) => (
              <div
                key={i}
                className="text-[10px] text-muted-foreground text-right"
                style={{ height: 12, lineHeight: "12px" }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid weeks */}
          {weeks.map((week, col) => (
            <div
              key={col}
              className="flex flex-col"
              style={{ gap: "3px" }}
            >
              {week.map((date, row) => {
                if (!date) {
                  return (
                    <div
                      key={row}
                      style={{ width: 12, height: 12 }}
                    />
                  );
                }
                const key = formatDate(date);
                const count = activities[key] || 0;
                return (
                  <div
                    key={row}
                    className={`rounded-sm cursor-pointer transition-opacity hover:opacity-70 ${getIntensity(count)}`}
                    style={{ width: 12, height: 12 }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({
                        text: `${count} action${count !== 1 ? "s" : ""} on ${key}`,
                        x: rect.left + rect.width / 2,
                        y: rect.top - 8,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>Less</span>
        {["bg-[#ebedf0] dark:bg-[#161b22]", "bg-[#9be9a8] dark:bg-[#0e4429]", "bg-[#40c463] dark:bg-[#006d32]", "bg-[#30a14e] dark:bg-[#26a641]", "bg-[#216e39] dark:bg-[#39d353]"].map(
          (cls, i) => (
            <div
              key={i}
              className={`rounded-sm ${cls}`}
              style={{ width: 12, height: 12 }}
            />
          ),
        )}
        <span>More</span>
      </div>

      {/* Tooltip (fixed positioning) */}
      {tooltip && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-lg border border-border bg-card px-2 py-1 text-xs shadow-lg -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
