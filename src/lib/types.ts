export interface DashboardFilters {
  groupIds?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface RubricStats {
  completionRate: number;
  totalPeople: number;
  assessedPeople: number;
  mean: number;
  median: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
}

export interface PercentileBandPoint {
  assessedAt: string;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface DistributionBucket {
  rangeStart: number;
  rangeEnd: number;
  label: string;
  count: number;
}

export interface PersonWithSteps {
  id: string;
  firstName: string;
  lastName: string;
  groupName: string;
  averageStep: number;
  stepCount: number;
}

export interface SubScoreDetail {
  subScoreId: string;
  subScoreName: string;
  skillName: string;
  values: { assessedAt: string; value: number }[];
}

export interface SubScoreAverage {
  subScoreId: string;
  subScoreName: string;
  skillName: string;
  average: number;
}
