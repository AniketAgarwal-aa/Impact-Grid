export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  teamSize: number;
  currentCost: number;
  currentTime: number;
  stage: "early" | "mid" | "late";
  createdAt: string;
}

export interface ChangeRequest {
  title: string;
  description: string;
  changeType: "addition" | "modification" | "removal";
  priority: "low" | "medium" | "high";
  complexity: "low" | "medium" | "high";
  affectedModules: string[];
}

export interface ImpactResult {
  changeSize: string;
  costImpact: {
    original: number;
    new: number;
    increase: number;
    percentage: number;
  };
  timeImpact: {
    original: number;
    new: number;
    increase: number;
    percentage: number;
  };
  effortImpact: {
    original: number;
    new: number;
    increase: number;
    percentage: number;
  };
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
  recommendations: string[];
  affectedComponents: {
    name: string;
    type: string;
    impact_level: string;
    owner: string;
  }[];
}

export interface Analysis {
  id: string;
  userId: string;
  project: Project;
  change: ChangeRequest;
  result: ImpactResult;
  createdAt: string;
  name: string;
}

export interface Scenario {
  id: string;
  userId: string;
  analysisId: string;
  name: string;
  result: ImpactResult;
  createdAt: string;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  type: "analysis" | "requirement" | "approval";
  timestamp: string;
  tags?: string[];
}
