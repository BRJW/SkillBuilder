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

export interface SkillPeriodRow {
  skillName: string;
  periods: { date: string; average: number; count: number }[];
}

export interface SubScorePeriodRow {
  skillName: string;
  subScoreName: string;
  periods: { date: string; average: number }[];
}

export interface GoalAttainmentRow {
  date: string;
  label: string;
  total: number;
  above50: number;
  above60: number;
  above70: number;
  above80: number;
  above90: number;
}

export interface ScopedDistribution {
  key: string;
  buckets: DistributionBucket[];
  stats: {
    mean: number;
    median: number;
    stdDev: number;
    p25: number;
    p75: number;
    count: number;
    pctAbove50: number;
    pctAbove60: number;
    pctAbove70: number;
    pctAbove80: number;
  };
}
