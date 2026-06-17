import type { ImpactResult } from "@/types";

export function calculateImpacts(project: unknown, change: unknown): ImpactResult {
  const complexityMap: Record<string, number> = { low: 1, medium: 2, high: 3, very_high: 4 };
  const changeTypeMap: Record<string, number> = {
    addition: 1.3,
    modification: 1.0,
    removal: 0.8,
  };
  const priorityMap: Record<string, number> = {
    low: 0.8,
    medium: 1.0,
    high: 1.4,
  };
  const stageMap: Record<string, number> = { early: 0.8, mid: 1.2, late: 1.8 };

  let score =
    complexityMap[change.complexity] * 0.35 +
    changeTypeMap[change.changeType] * 0.25 +
    priorityMap[change.priority] * 0.2 +
    stageMap[project.stage] * 0.2;

  const moduleFactor = 1 + (change.affectedModules?.length || 0) * 0.1;
  score *= moduleFactor;

  const changeSize = score < 1.5 ? "Small" : score > 2.5 ? "Large" : "Medium";
  const multiplier = score < 1.5 ? 1.05 : score > 2.5 ? 1.3 : 1.15;
  const baseDays = 10;
  const timeIncrease = baseDays * (multiplier - 1) * (project.teamSize / 5);
  const dailyRate = project.currentCost / project.currentTime;
  const costIncrease =
    timeIncrease * dailyRate * (complexityMap[change.complexity] / 1.5);
  const currentEffort = project.currentTime * project.teamSize;
  const effortIncrease = timeIncrease * project.teamSize;

  let riskScore = 0;
  riskScore += Math.min(score * 15, 40);
  riskScore += stageMap[project.stage] * 15;
  riskScore += priorityMap[change.priority] * 15;
  riskScore += (change.affectedModules?.length || 0) * 5;
  riskScore = Math.min(Math.round(riskScore), 100);

  const riskLevel: "low" | "medium" | "high" =
    riskScore < 30 ? "low" : riskScore < 60 ? "medium" : "high";

  const recommendations: string[] = [];
  if (riskLevel === "high") {
    recommendations.push("⚠️ Board approval required before proceeding");
    recommendations.push("📋 Add 20% contingency buffer to budget");
    recommendations.push("🔍 Conduct thorough regression testing");
  } else if (riskLevel === "medium") {
    recommendations.push("📝 Create detailed implementation plan");
    recommendations.push("🔍 Perform peer review on affected modules");
  } else {
    recommendations.push("✅ Proceed with standard change management process");
  }

  return {
    changeSize,
    costImpact: {
      original: project.currentCost,
      new: project.currentCost + costIncrease,
      increase: costIncrease,
      percentage: (costIncrease / project.currentCost) * 100,
    },
    timeImpact: {
      original: project.currentTime,
      new: project.currentTime + timeIncrease,
      increase: timeIncrease,
      percentage: (timeIncrease / project.currentTime) * 100,
    },
    effortImpact: {
      original: currentEffort,
      new: currentEffort + effortIncrease,
      increase: effortIncrease,
      percentage: (effortIncrease / currentEffort) * 100,
    },
    riskLevel,
    riskScore,
    recommendations,
    affectedComponents: [
      {
        name: "User Authentication Service",
        type: "Backend API",
        impact_level: "Critical",
        owner: "Sarah Jenkins",
      },
      {
        name: "Customer Profile DB",
        type: "Database",
        impact_level: "High",
        owner: "Data Ops Team",
      },
      {
        name: "Frontend Dashboard",
        type: "UI/UX",
        impact_level: "Medium",
        owner: "Mark Lee",
      },
    ],
  };
}
