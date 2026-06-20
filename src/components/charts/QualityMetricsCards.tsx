/** Quality metrics dashboard cards */
import { Bug, ShieldCheck, TestTube2 } from "lucide-react";

interface QualityMetricsProps {
  bugDensity?: number;
  codeCoverage?: number;
  testPassRate?: number;
  qualityImpact?: number;
  securityImpact?: number;
  maintainabilityImpact?: number;
}

function statusLabel(value: number, thresholds: [number, number], labels: [string, string, string]) {
  if (value >= thresholds[1]) return { label: labels[2], color: "text-red-500", bg: "bg-red-500/10" };
  if (value >= thresholds[0]) return { label: labels[1], color: "text-amber-500", bg: "bg-amber-500/10" };
  return { label: labels[0], color: "text-emerald-500", bg: "bg-emerald-500/10" };
}

export function QualityMetricsCards({
  bugDensity,
  codeCoverage,
  testPassRate,
  qualityImpact,
  securityImpact,
  maintainabilityImpact,
}: QualityMetricsProps) {
  const bugs = bugDensity ?? Math.round((qualityImpact ?? 30) * 0.4);
  const coverage = codeCoverage ?? Math.max(50, 100 - (qualityImpact ?? 30));
  const testPass = testPassRate ?? Math.max(70, 100 - Math.round((maintainabilityImpact ?? 20) * 0.5));

  const bugStatus = statusLabel(bugs, [8, 15], ["Good", "Medium", "High"]);
  const covStatus = statusLabel(100 - coverage, [25, 40], ["Good", "Fair", "Low"]);
  const testStatus = statusLabel(100 - testPass, [10, 20], ["Good", "Fair", "Low"]);

  const items = [
    {
      label: "Bug Density",
      value: `${bugs}/1000`,
      sub: "defects per KLOC",
      icon: Bug,
      status: bugStatus,
    },
    {
      label: "Code Coverage",
      value: `${coverage}%`,
      sub: "lines covered",
      icon: ShieldCheck,
      status: covStatus,
    },
    {
      label: "Test Pass Rate",
      value: `${testPass}%`,
      sub: "automated tests",
      icon: TestTube2,
      status: testStatus,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-border bg-card/80 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${item.status.bg}`}>
              <item.icon className={`h-4 w-4 ${item.status.color}`} />
            </div>
            <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
          </div>
          <div className="text-2xl font-bold tabular-nums">{item.value}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</div>
          <div className={`text-xs font-semibold mt-2 ${item.status.color}`}>
            {item.status.label}
          </div>
        </div>
      ))}
    </div>
  );
}
