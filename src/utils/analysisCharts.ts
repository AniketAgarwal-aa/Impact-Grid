/** Shared helpers for building chart data from impact analyses */

export function groupBy<T>(arr: T[], key: keyof T): Record<string, number> {
  return arr.reduce((acc: Record<string, number>, item) => {
    const k = String(item[key] || "unknown");
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

export function toChartData(counts: Record<string, number>) {
  return Object.entries(counts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " "),
    value,
    rawName: name,
  }));
}

export type AnalysisLike = {
  id?: number;
  cost_impact?: {
    original?: number;
    new?: number;
    increase?: number;
    percentage?: number;
    breakdown?: Record<string, number>;
  };
  time_impact?: {
    original?: number;
    new?: number;
    increase?: number;
    percentage?: number;
    breakdown?: Record<string, number>;
  };
  effort_impact?: {
    original?: number;
    new?: number;
    increase?: number;
    percentage?: number;
    breakdown?: Record<string, number>;
  };
  risk_score?: number;
  risk_level?: string;
  risk_breakdown?: Record<string, number>;
  affected_components?: Array<{
    name: string;
    estimated_hours?: number;
    priority?: number;
  }>;
  recommendations?: string[];
  dependency_chain?: string;
  currency?: string;
  change_description?: string;
};

/** Merge multiple analyses into one aggregate view for project/requirement dashboards */
export function aggregateAnalyses(analyses: AnalysisLike[]): AnalysisLike | null {
  if (!analyses.length) return null;
  const n = analyses.length;

  const sumCostBd = (k: string) =>
    analyses.reduce((s, a) => s + (a.cost_impact?.breakdown?.[k] || 0), 0);
  const sumTimeBd = (k: string) =>
    analyses.reduce((s, a) => s + (a.time_impact?.breakdown?.[k] || 0), 0);
  const sumEffortBd = (k: string) =>
    analyses.reduce((s, a) => s + (a.effort_impact?.breakdown?.[k] || 0), 0);
  const sumRiskBd = (k: string) =>
    analyses.reduce((s, a) => s + (a.risk_breakdown?.[k] || 0), 0);

  const costOriginal = analyses.reduce((s, a) => s + (a.cost_impact?.original || 0), 0) / n;
  const costNew = analyses.reduce((s, a) => s + (a.cost_impact?.new || 0), 0);
  const costIncrease = analyses.reduce((s, a) => s + (a.cost_impact?.increase || 0), 0);

  const timeOriginal = analyses.reduce((s, a) => s + (a.time_impact?.original || 0), 0) / n;
  const timeNew = analyses.reduce((s, a) => s + (a.time_impact?.new || 0), 0);
  const timeIncrease = analyses.reduce((s, a) => s + (a.time_impact?.increase || 0), 0);

  const effortOriginal = analyses.reduce((s, a) => s + (a.effort_impact?.original || 0), 0) / n;
  const effortNew = analyses.reduce((s, a) => s + (a.effort_impact?.new || 0), 0);
  const effortIncrease = analyses.reduce((s, a) => s + (a.effort_impact?.increase || 0), 0);

  const riskScore = Math.round(
    analyses.reduce((s, a) => s + (a.risk_score || 0), 0) / n,
  );

  const allComponents = analyses.flatMap((a) => a.affected_components || []);
  const allRecs = [...new Set(analyses.flatMap((a) => a.recommendations || []))];

  return {
    currency: analyses[0].currency,
    cost_impact: {
      original: costOriginal,
      new: costNew,
      increase: costIncrease,
      percentage: costOriginal > 0 ? Math.round((costIncrease / costOriginal) * 100) : 0,
      breakdown: {
        labor: sumCostBd("labor"),
        infrastructure: sumCostBd("infrastructure"),
        third_party: sumCostBd("third_party"),
        contingency: sumCostBd("contingency"),
        training: sumCostBd("training"),
        documentation: sumCostBd("documentation"),
      },
    },
    time_impact: {
      original: timeOriginal,
      new: timeNew,
      increase: timeIncrease,
      percentage: timeOriginal > 0 ? Math.round((timeIncrease / timeOriginal) * 100) : 0,
      breakdown: {
        development: sumTimeBd("development"),
        testing: sumTimeBd("testing"),
        deployment: sumTimeBd("deployment"),
        review: sumTimeBd("review"),
        documentation: sumTimeBd("documentation"),
      },
    },
    effort_impact: {
      original: effortOriginal,
      new: effortNew,
      increase: effortIncrease,
      percentage: effortOriginal > 0 ? Math.round((effortIncrease / effortOriginal) * 100) : 0,
      breakdown: {
        senior: sumEffortBd("senior"),
        mid: sumEffortBd("mid"),
        junior: sumEffortBd("junior"),
      },
    },
    risk_score: riskScore,
    risk_level:
      riskScore > 75 ? "critical" : riskScore > 50 ? "high" : riskScore > 25 ? "medium" : "low",
    risk_breakdown: {
      schedule: Math.round(sumRiskBd("schedule") / n),
      budget: Math.round(sumRiskBd("budget") / n),
      quality: Math.round(sumRiskBd("quality") / n),
      security: Math.round(sumRiskBd("security") / n),
      technical: Math.round(sumRiskBd("technical") / n),
    },
    affected_components: allComponents,
    recommendations: allRecs.slice(0, 8),
    dependency_chain: analyses.map((a) => a.change_description || "CR").join(" → "),
  };
}

export function buildCostTrendFromAnalyses(analyses: AnalysisLike[], labelKey: "index" | "description" = "index") {
  return analyses
    .filter((a) => a.cost_impact)
    .map((a, i) => ({
      cr: labelKey === "description"
        ? (a.change_description?.slice(0, 12) || `CR ${i + 1}`)
        : `CR ${i + 1}`,
      cost: Math.round(a.cost_impact?.increase || 0),
      total: Math.round(a.cost_impact?.new || 0),
    }));
}

export function buildRiskTrendFromAnalyses(analyses: AnalysisLike[]) {
  return analyses
    .filter((a) => a.risk_score != null)
    .map((a, i) => ({
      cr: `CR ${i + 1}`,
      risk: a.risk_score || 0,
    }));
}

export function buildBurndownFromAnalysis(analysis: AnalysisLike | null) {
  const totalTimeNew = analysis?.time_impact?.new || 0;
  if (totalTimeNew <= 0) return [];
  return Array.from({ length: 7 }, (_, i) => {
    const planned = Math.max(0, Math.round(totalTimeNew - (totalTimeNew / 6) * i));
    const actual = Math.max(
      0,
      planned + (i < 3 ? Math.round(totalTimeNew * 0.03) : -Math.round(totalTimeNew * 0.02 * (i - 2))),
    );
    return { day: `D${i + 1}`, planned, actual };
  });
}

export function buildImpactDistribution(analysis: AnalysisLike | null) {
  if (!analysis) return [];
  const cost = analysis.cost_impact || {};
  const time = analysis.time_impact || {};
  const effort = analysis.effort_impact || {};
  return [
    { metric: "Cost", current: cost.original || 0, projected: cost.new || 0 },
    { metric: "Time", current: time.original || 0, projected: time.new || 0 },
    { metric: "Effort", current: effort.original || 0, projected: effort.new || 0 },
  ];
}
