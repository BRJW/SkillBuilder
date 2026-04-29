import { prisma } from "@/lib/prisma";
import type {
  DashboardFilters,
  RubricGoal,
  RubricStats,
  PercentileBandPoint,
  DistributionBucket,
  SubScoreAverage,
  SkillPeriodRow,
  SubScorePeriodRow,
  GoalAttainmentRow,
  ScopedDistribution,
} from "@/lib/types";

function buildWhereClause(rubricId: string, filters: DashboardFilters) {
  const conditions: string[] = [
    `rs."rubricId" = '${rubricId}'`,
  ];
  if (filters.groupIds && filters.groupIds.length > 0) {
    const ids = filters.groupIds.map((id) => `'${id}'`).join(",");
    conditions.push(`p."groupId" IN (${ids})`);
  }
  if (filters.dateFrom) {
    conditions.push(`s."assessedAt" >= '${filters.dateFrom}'`);
  }
  if (filters.dateTo) {
    conditions.push(`s."assessedAt" <= '${filters.dateTo}'`);
  }
  return conditions.join(" AND ");
}

function r1(v: number) {
  return Math.round(Number(v) * 10) / 10;
}

// --- Bucket / stats helpers ---

function buildBucketsFromRaw(
  rawRows: { bucket: number; count: bigint }[]
): DistributionBucket[] {
  const buckets: DistributionBucket[] = [];
  for (let i = 0; i <= 95; i += 5) {
    const found = rawRows.find((r) => Number(r.bucket) === i);
    buckets.push({
      rangeStart: i,
      rangeEnd: i + 5,
      label: `${i}`,
      count: found ? Number(found.count) : 0,
    });
  }
  return buckets;
}

function buildStats(
  statsRow: {
    mean: number; median: number; stddev: number;
    p25: number; p75: number; count: bigint;
    above_goal: bigint;
  },
  goalThreshold: number
) {
  const count = Number(statsRow.count);
  return {
    mean: r1(statsRow.mean),
    median: r1(statsRow.median),
    stdDev: r1(statsRow.stddev),
    p25: r1(statsRow.p25),
    p75: r1(statsRow.p75),
    count,
    pctMeetingGoal: count > 0 ? Math.round((Number(statsRow.above_goal) / count) * 1000) / 10 : 0,
    goalThreshold: r1(goalThreshold),
  };
}

/** Compute stats from raw averages array in application code (for varying-goal queries) */
function computeStatsFromAvgs(avgs: number[], goalThreshold: number) {
  if (avgs.length === 0) {
    return { mean: 0, median: 0, stdDev: 0, p25: 0, p75: 0, count: 0, pctMeetingGoal: 0, goalThreshold: r1(goalThreshold) };
  }
  const sorted = [...avgs].sort((a, b) => a - b);
  const count = sorted.length;
  const mean = avgs.reduce((a, b) => a + b, 0) / count;
  const median = count % 2 === 0
    ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
    : sorted[Math.floor(count / 2)];
  const variance = avgs.reduce((sum, v) => sum + (v - mean) ** 2, 0) / count;
  const stdDev = Math.sqrt(variance);
  const p25 = sorted[Math.floor(count * 0.25)];
  const p75 = sorted[Math.floor(count * 0.75)];
  const aboveGoal = avgs.filter((v) => v >= goalThreshold).length;

  return {
    mean: r1(mean),
    median: r1(median),
    stdDev: r1(stdDev),
    p25: r1(p25),
    p75: r1(p75),
    count,
    pctMeetingGoal: Math.round((aboveGoal / count) * 1000) / 10,
    goalThreshold: r1(goalThreshold),
  };
}

function computeBuckets(avgs: number[]): DistributionBucket[] {
  const counts: Record<number, number> = {};
  for (const v of avgs) {
    const bucket = Math.floor(v / 5) * 5;
    counts[bucket] = (counts[bucket] || 0) + 1;
  }
  const buckets: DistributionBucket[] = [];
  for (let i = 0; i <= 95; i += 5) {
    buckets.push({ rangeStart: i, rangeEnd: i + 5, label: `${i}`, count: counts[i] || 0 });
  }
  return buckets;
}

// --- Core queries ---

export async function getAggregateStats(
  rubricId: string,
  filters: DashboardFilters,
  goals: RubricGoal
): Promise<RubricStats> {
  const where = buildWhereClause(rubricId, filters);
  const goal = goals.rubricGoal;

  const result = await prisma.$queryRawUnsafe<
    {
      total_people: bigint;
      assessed_people: bigint;
      mean: number | null;
      median: number | null;
      p10: number | null;
      p25: number | null;
      p75: number | null;
      p90: number | null;
      above_goal: bigint;
    }[]
  >(`
    WITH person_avgs AS (
      SELECT s."personId", AVG(s.value) as avg_step
      FROM "Step" s
      JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
      JOIN "Person" p ON s."personId" = p.id
      WHERE ${where}
      GROUP BY s."personId"
    ),
    total AS (
      SELECT COUNT(DISTINCT p.id) as total_people
      FROM "Person" p
      ${filters.groupIds && filters.groupIds.length > 0 ? `WHERE p."groupId" IN (${filters.groupIds.map((id) => `'${id}'`).join(",")})` : ""}
    )
    SELECT
      t.total_people,
      COUNT(pa."personId") as assessed_people,
      AVG(pa.avg_step) as mean,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pa.avg_step) as median,
      PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY pa.avg_step) as p10,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY pa.avg_step) as p25,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY pa.avg_step) as p75,
      PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY pa.avg_step) as p90,
      COUNT(CASE WHEN pa.avg_step >= ${goal} THEN 1 END) as above_goal
    FROM person_avgs pa
    CROSS JOIN total t
    GROUP BY t.total_people
  `);

  if (!result.length || result[0].mean === null) {
    return {
      completionRate: 0, totalPeople: 0, assessedPeople: 0,
      mean: 0, median: 0, p10: 0, p25: 0, p75: 0, p90: 0,
      goalScore: goal, pctMeetingGoal: 0,
    };
  }

  const row = result[0];
  const totalPeople = Number(row.total_people);
  const assessedPeople = Number(row.assessed_people);

  return {
    completionRate: totalPeople > 0 ? (assessedPeople / totalPeople) * 100 : 0,
    totalPeople,
    assessedPeople,
    mean: r1(row.mean ?? 0),
    median: r1(row.median ?? 0),
    p10: r1(row.p10 ?? 0),
    p25: r1(row.p25 ?? 0),
    p75: r1(row.p75 ?? 0),
    p90: r1(row.p90 ?? 0),
    goalScore: goal,
    pctMeetingGoal: assessedPeople > 0 ? Math.round((Number(row.above_goal) / assessedPeople) * 1000) / 10 : 0,
  };
}

export async function getStepDistribution(
  rubricId: string,
  filters: DashboardFilters
): Promise<DistributionBucket[]> {
  const where = buildWhereClause(rubricId, filters);

  const result = await prisma.$queryRawUnsafe<
    { bucket: number; count: bigint }[]
  >(`
    WITH person_avgs AS (
      SELECT s."personId", AVG(s.value) as avg_step
      FROM "Step" s
      JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
      JOIN "Person" p ON s."personId" = p.id
      WHERE ${where}
      GROUP BY s."personId"
    )
    SELECT
      FLOOR(avg_step / 5) * 5 as bucket,
      COUNT(*) as count
    FROM person_avgs
    GROUP BY bucket
    ORDER BY bucket
  `);

  return buildBucketsFromRaw(result);
}

export async function getPercentileBands(
  rubricId: string,
  filters: DashboardFilters
): Promise<PercentileBandPoint[]> {
  const groupFilter =
    filters.groupIds && filters.groupIds.length > 0
      ? `AND p."groupId" IN (${filters.groupIds.map((id) => `'${id}'`).join(",")})`
      : "";

  const result = await prisma.$queryRawUnsafe<
    { assessed_at: Date; p10: number; p25: number; p50: number; p75: number; p90: number }[]
  >(`
    WITH person_period_avgs AS (
      SELECT s."personId", s."assessedAt", AVG(s.value) as avg_step
      FROM "Step" s
      JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
      JOIN "Person" p ON s."personId" = p.id
      WHERE rs."rubricId" = '${rubricId}' ${groupFilter}
      GROUP BY s."personId", s."assessedAt"
    )
    SELECT
      "assessedAt" as assessed_at,
      PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY avg_step) as p10,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY avg_step) as p25,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY avg_step) as p50,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY avg_step) as p75,
      PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY avg_step) as p90
    FROM person_period_avgs
    GROUP BY "assessedAt"
    ORDER BY "assessedAt"
  `);

  return result.map((row) => ({
    assessedAt: row.assessed_at.toISOString().split("T")[0],
    p10: r1(row.p10), p25: r1(row.p25), p50: r1(row.p50), p75: r1(row.p75), p90: r1(row.p90),
  }));
}

export async function getSubScoreAverages(
  rubricId: string,
  filters: DashboardFilters
): Promise<SubScoreAverage[]> {
  const where = buildWhereClause(rubricId, filters);

  const result = await prisma.$queryRawUnsafe<
    { sub_score_id: string; sub_score_name: string; skill_name: string; average: number }[]
  >(`
    SELECT ss.id as sub_score_id, ss.name as sub_score_name, sk.name as skill_name, AVG(s.value) as average
    FROM "Step" s
    JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
    JOIN "SubScore" ss ON s."subScoreId" = ss.id
    JOIN "Skill" sk ON ss."skillId" = sk.id
    JOIN "Person" p ON s."personId" = p.id
    WHERE ${where}
    GROUP BY ss.id, ss.name, sk.name
    ORDER BY sk.name, ss.name
  `);

  return result.map((row) => ({
    subScoreId: row.sub_score_id, subScoreName: row.sub_score_name,
    skillName: row.skill_name, average: r1(row.average),
  }));
}

export async function getSkillAverages(
  rubricId: string,
  filters: DashboardFilters
): Promise<{ skillName: string; average: number }[]> {
  const where = buildWhereClause(rubricId, filters);

  const result = await prisma.$queryRawUnsafe<
    { skill_name: string; average: number }[]
  >(`
    SELECT sk.name as skill_name, AVG(s.value) as average
    FROM "Step" s
    JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
    JOIN "SubScore" ss ON s."subScoreId" = ss.id
    JOIN "Skill" sk ON ss."skillId" = sk.id
    JOIN "Person" p ON s."personId" = p.id
    WHERE ${where}
    GROUP BY sk.name ORDER BY sk.name
  `);

  return result.map((row) => ({ skillName: row.skill_name, average: r1(row.average) }));
}

export async function getGroupComparison(
  rubricId: string,
  filters: DashboardFilters
): Promise<{ groupName: string; average: number; count: number }[]> {
  const dateFilter = [
    filters.dateFrom ? `AND s."assessedAt" >= '${filters.dateFrom}'` : "",
    filters.dateTo ? `AND s."assessedAt" <= '${filters.dateTo}'` : "",
  ].join(" ");

  const result = await prisma.$queryRawUnsafe<
    { group_name: string; average: number; count: bigint }[]
  >(`
    SELECT g.name as group_name, AVG(s.value) as average, COUNT(DISTINCT s."personId") as count
    FROM "Step" s
    JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
    JOIN "Person" p ON s."personId" = p.id
    JOIN "Group" g ON p."groupId" = g.id
    WHERE rs."rubricId" = '${rubricId}' ${dateFilter}
    GROUP BY g.name ORDER BY average DESC
  `);

  return result.map((row) => ({ groupName: row.group_name, average: r1(row.average), count: Number(row.count) }));
}

export async function getTopBottomPerformers(
  rubricId: string,
  filters: DashboardFilters,
  limit: number = 5
): Promise<{ top: { name: string; groupName: string; avg: number }[]; bottom: { name: string; groupName: string; avg: number }[] }> {
  const where = buildWhereClause(rubricId, filters);

  const result = await prisma.$queryRawUnsafe<
    { first_name: string; last_name: string; group_name: string; avg_step: number }[]
  >(`
    SELECT p."firstName" as first_name, p."lastName" as last_name, g.name as group_name, AVG(s.value) as avg_step
    FROM "Step" s
    JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
    JOIN "Person" p ON s."personId" = p.id
    JOIN "Group" g ON p."groupId" = g.id
    WHERE ${where}
    GROUP BY p.id, p."firstName", p."lastName", g.name
    ORDER BY avg_step DESC
  `);

  const mapped = result.map((r) => ({ name: `${r.first_name} ${r.last_name}`, groupName: r.group_name, avg: r1(r.avg_step) }));
  return { top: mapped.slice(0, limit), bottom: mapped.slice(-limit).reverse() };
}

// --- Trend queries ---

export async function getGroupTrends(
  rubricId: string,
  filters: DashboardFilters
): Promise<{ groupName: string; current: number; previous: number; change: number; count: number }[]> {
  const dateFilter = [
    filters.dateFrom ? `AND s."assessedAt" >= '${filters.dateFrom}'` : "",
    filters.dateTo ? `AND s."assessedAt" <= '${filters.dateTo}'` : "",
  ].join(" ");

  const result = await prisma.$queryRawUnsafe<
    { group_name: string; assessed_at: Date; average: number; count: bigint }[]
  >(`
    SELECT g.name as group_name, s."assessedAt" as assessed_at, AVG(s.value) as average, COUNT(DISTINCT s."personId") as count
    FROM "Step" s
    JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
    JOIN "Person" p ON s."personId" = p.id
    JOIN "Group" g ON p."groupId" = g.id
    WHERE rs."rubricId" = '${rubricId}' ${dateFilter}
    GROUP BY g.name, s."assessedAt"
    ORDER BY g.name, s."assessedAt"
  `);

  const byGroup: Record<string, { date: Date; avg: number; count: number }[]> = {};
  for (const row of result) {
    if (!byGroup[row.group_name]) byGroup[row.group_name] = [];
    byGroup[row.group_name].push({ date: row.assessed_at, avg: Number(row.average), count: Number(row.count) });
  }

  return Object.entries(byGroup).map(([groupName, periods]) => {
    const current = periods[periods.length - 1];
    const previous = periods.length >= 2 ? periods[periods.length - 2] : current;
    return { groupName, current: r1(current.avg), previous: r1(previous.avg), change: r1(current.avg - previous.avg), count: current.count };
  }).sort((a, b) => b.current - a.current);
}

export async function getSkillTrends(
  rubricId: string,
  filters: DashboardFilters
): Promise<{ skillName: string; current: number; previous: number; change: number }[]> {
  const where = buildWhereClause(rubricId, filters);

  const result = await prisma.$queryRawUnsafe<
    { skill_name: string; assessed_at: Date; average: number }[]
  >(`
    SELECT sk.name as skill_name, s."assessedAt" as assessed_at, AVG(s.value) as average
    FROM "Step" s
    JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
    JOIN "SubScore" ss ON s."subScoreId" = ss.id
    JOIN "Skill" sk ON ss."skillId" = sk.id
    JOIN "Person" p ON s."personId" = p.id
    WHERE ${where}
    GROUP BY sk.name, s."assessedAt"
    ORDER BY sk.name, s."assessedAt"
  `);

  const bySkill: Record<string, { avg: number }[]> = {};
  for (const row of result) {
    if (!bySkill[row.skill_name]) bySkill[row.skill_name] = [];
    bySkill[row.skill_name].push({ avg: Number(row.average) });
  }

  return Object.entries(bySkill).map(([skillName, periods]) => {
    const current = periods[periods.length - 1];
    const previous = periods.length >= 2 ? periods[periods.length - 2] : current;
    return { skillName, current: r1(current.avg), previous: r1(previous.avg), change: r1(current.avg - previous.avg) };
  });
}

export async function getDistributionTrend(
  rubricId: string,
  filters: DashboardFilters
): Promise<{ assessedAt: string; mean: number; stdDev: number; count: number }[]> {
  const groupFilter =
    filters.groupIds && filters.groupIds.length > 0
      ? `AND p."groupId" IN (${filters.groupIds.map((id) => `'${id}'`).join(",")})`
      : "";

  const result = await prisma.$queryRawUnsafe<
    { assessed_at: Date; mean: number; stddev: number; count: bigint }[]
  >(`
    WITH person_period_avgs AS (
      SELECT s."personId", s."assessedAt", AVG(s.value) as avg_step
      FROM "Step" s
      JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
      JOIN "Person" p ON s."personId" = p.id
      WHERE rs."rubricId" = '${rubricId}' ${groupFilter}
      GROUP BY s."personId", s."assessedAt"
    )
    SELECT "assessedAt" as assessed_at, AVG(avg_step) as mean, COALESCE(STDDEV(avg_step), 0) as stddev, COUNT(*) as count
    FROM person_period_avgs
    GROUP BY "assessedAt" ORDER BY "assessedAt"
  `);

  return result.map((row) => ({
    assessedAt: row.assessed_at.toISOString().split("T")[0],
    mean: r1(row.mean), stdDev: r1(row.stddev), count: Number(row.count),
  }));
}

// --- Trend matrix queries ---

export async function getSkillPeriodMatrix(
  rubricId: string,
  filters: DashboardFilters
): Promise<SkillPeriodRow[]> {
  const where = buildWhereClause(rubricId, filters);

  const result = await prisma.$queryRawUnsafe<
    { skill_name: string; assessed_at: Date; average: number; count: bigint }[]
  >(`
    SELECT sk.name as skill_name, s."assessedAt" as assessed_at, AVG(s.value) as average, COUNT(DISTINCT s."personId") as count
    FROM "Step" s
    JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
    JOIN "SubScore" ss ON s."subScoreId" = ss.id
    JOIN "Skill" sk ON ss."skillId" = sk.id
    JOIN "Person" p ON s."personId" = p.id
    WHERE ${where}
    GROUP BY sk.name, s."assessedAt"
    ORDER BY sk.name, s."assessedAt"
  `);

  const bySkill: Record<string, { date: string; average: number; count: number }[]> = {};
  for (const row of result) {
    if (!bySkill[row.skill_name]) bySkill[row.skill_name] = [];
    bySkill[row.skill_name].push({ date: row.assessed_at.toISOString().split("T")[0], average: r1(row.average), count: Number(row.count) });
  }

  return Object.entries(bySkill).map(([skillName, periods]) => ({ skillName, periods }));
}

export async function getSubScorePeriodMatrix(
  rubricId: string,
  filters: DashboardFilters
): Promise<SubScorePeriodRow[]> {
  const where = buildWhereClause(rubricId, filters);

  const result = await prisma.$queryRawUnsafe<
    { skill_name: string; sub_score_name: string; assessed_at: Date; average: number }[]
  >(`
    SELECT sk.name as skill_name, ss.name as sub_score_name, s."assessedAt" as assessed_at, AVG(s.value) as average
    FROM "Step" s
    JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
    JOIN "SubScore" ss ON s."subScoreId" = ss.id
    JOIN "Skill" sk ON ss."skillId" = sk.id
    JOIN "Person" p ON s."personId" = p.id
    WHERE ${where}
    GROUP BY sk.name, ss.name, s."assessedAt"
    ORDER BY sk.name, ss.name, s."assessedAt"
  `);

  const byKey: Record<string, { date: string; average: number }[]> = {};
  const keyMeta: Record<string, { skillName: string; subScoreName: string }> = {};
  for (const row of result) {
    const key = `${row.skill_name}::${row.sub_score_name}`;
    if (!byKey[key]) { byKey[key] = []; keyMeta[key] = { skillName: row.skill_name, subScoreName: row.sub_score_name }; }
    byKey[key].push({ date: row.assessed_at.toISOString().split("T")[0], average: r1(row.average) });
  }

  return Object.entries(byKey).map(([key, periods]) => ({ ...keyMeta[key], periods }));
}

export async function getGoalAttainment(
  rubricId: string,
  filters: DashboardFilters,
  goals: RubricGoal
): Promise<GoalAttainmentRow[]> {
  const groupFilter =
    filters.groupIds && filters.groupIds.length > 0
      ? `AND p."groupId" IN (${filters.groupIds.map((id) => `'${id}'`).join(",")})`
      : "";
  const goal = goals.rubricGoal;
  const fractions = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

  const fractionalCases = fractions
    .map((f) => `COUNT(CASE WHEN avg_step >= ${goal * f} THEN 1 END) as at_${Math.round(f * 100)}pct`)
    .join(",\n      ");

  const result = await prisma.$queryRawUnsafe<
    Record<string, unknown>[]
  >(`
    WITH person_period_avgs AS (
      SELECT s."personId", s."assessedAt", AVG(s.value) as avg_step
      FROM "Step" s
      JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
      JOIN "Person" p ON s."personId" = p.id
      WHERE rs."rubricId" = '${rubricId}' ${groupFilter}
      GROUP BY s."personId", s."assessedAt"
    )
    SELECT
      "assessedAt" as assessed_at,
      COUNT(*) as total,
      ${fractionalCases}
    FROM person_period_avgs
    GROUP BY "assessedAt"
    ORDER BY "assessedAt"
  `);

  return result.map((row) => {
    const d = row.assessed_at as Date;
    const total = Number(row.total as bigint);
    return {
      date: d.toISOString().split("T")[0],
      label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      total,
      meetingStandard: Number(row.at_100pct as bigint),
      fractionalCounts: fractions.map((f) => ({
        fraction: f,
        count: Number(row[`at_${Math.round(f * 100)}pct`] as bigint),
      })),
    };
  });
}

// --- Scoped distribution queries (uniform goal: overall, by-group, by-period) ---

export async function getDistributionBySkill(
  rubricId: string,
  filters: DashboardFilters,
  goals: RubricGoal
): Promise<ScopedDistribution[]> {
  const where = buildWhereClause(rubricId, filters);

  // Fetch raw per-person per-skill averages; compute goal-meeting in app code since each skill has a different goal
  const rawRows = await prisma.$queryRawUnsafe<
    { skill_name: string; avg_step: number }[]
  >(`
    SELECT sk.name as skill_name, AVG(s.value) as avg_step
    FROM "Step" s
    JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
    JOIN "SubScore" ss ON s."subScoreId" = ss.id
    JOIN "Skill" sk ON ss."skillId" = sk.id
    JOIN "Person" p ON s."personId" = p.id
    WHERE ${where}
    GROUP BY s."personId", sk.name
  `);

  const bySkill: Record<string, number[]> = {};
  for (const row of rawRows) {
    if (!bySkill[row.skill_name]) bySkill[row.skill_name] = [];
    bySkill[row.skill_name].push(Number(row.avg_step));
  }

  return Object.entries(bySkill)
    .map(([skillName, avgs]) => {
      const goal = goals.skillGoals[skillName] ?? goals.rubricGoal;
      return {
        key: skillName,
        buckets: computeBuckets(avgs),
        stats: computeStatsFromAvgs(avgs, goal),
      };
    })
    .sort((a, b) => b.stats.mean - a.stats.mean);
}

export async function getDistributionByGroup(
  rubricId: string,
  filters: DashboardFilters,
  goals: RubricGoal
): Promise<ScopedDistribution[]> {
  const dateFilter = [
    filters.dateFrom ? `AND s."assessedAt" >= '${filters.dateFrom}'` : "",
    filters.dateTo ? `AND s."assessedAt" <= '${filters.dateTo}'` : "",
  ].join(" ");
  const goal = goals.rubricGoal;

  const bucketRows = await prisma.$queryRawUnsafe<
    { group_name: string; bucket: number; count: bigint }[]
  >(`
    WITH person_group_avgs AS (
      SELECT s."personId", g.name as group_name, AVG(s.value) as avg_step
      FROM "Step" s
      JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
      JOIN "Person" p ON s."personId" = p.id
      JOIN "Group" g ON p."groupId" = g.id
      WHERE rs."rubricId" = '${rubricId}' ${dateFilter}
      GROUP BY s."personId", g.name
    )
    SELECT group_name, FLOOR(avg_step / 5) * 5 as bucket, COUNT(*) as count
    FROM person_group_avgs
    GROUP BY group_name, bucket ORDER BY group_name, bucket
  `);

  const statsRows = await prisma.$queryRawUnsafe<
    {
      group_name: string; mean: number; median: number; stddev: number;
      p25: number; p75: number; count: bigint; above_goal: bigint;
    }[]
  >(`
    WITH person_group_avgs AS (
      SELECT s."personId", g.name as group_name, AVG(s.value) as avg_step
      FROM "Step" s
      JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
      JOIN "Person" p ON s."personId" = p.id
      JOIN "Group" g ON p."groupId" = g.id
      WHERE rs."rubricId" = '${rubricId}' ${dateFilter}
      GROUP BY s."personId", g.name
    )
    SELECT group_name,
      AVG(avg_step) as mean, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY avg_step) as median,
      COALESCE(STDDEV(avg_step), 0) as stddev, PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY avg_step) as p25,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY avg_step) as p75, COUNT(*) as count,
      COUNT(CASE WHEN avg_step >= ${goal} THEN 1 END) as above_goal
    FROM person_group_avgs
    GROUP BY group_name ORDER BY mean DESC
  `);

  const byGroup: Record<string, { bucket: number; count: bigint }[]> = {};
  for (const row of bucketRows) {
    if (!byGroup[row.group_name]) byGroup[row.group_name] = [];
    byGroup[row.group_name].push({ bucket: row.bucket, count: row.count });
  }

  return statsRows.map((sr) => ({
    key: sr.group_name,
    buckets: buildBucketsFromRaw(byGroup[sr.group_name] || []),
    stats: buildStats(sr, goal),
  }));
}

export async function getDistributionByPeriod(
  rubricId: string,
  filters: DashboardFilters,
  goals: RubricGoal
): Promise<ScopedDistribution[]> {
  const groupFilter =
    filters.groupIds && filters.groupIds.length > 0
      ? `AND p."groupId" IN (${filters.groupIds.map((id) => `'${id}'`).join(",")})`
      : "";
  const goal = goals.rubricGoal;

  const bucketRows = await prisma.$queryRawUnsafe<
    { assessed_at: Date; bucket: number; count: bigint }[]
  >(`
    WITH person_period_avgs AS (
      SELECT s."personId", s."assessedAt", AVG(s.value) as avg_step
      FROM "Step" s
      JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
      JOIN "Person" p ON s."personId" = p.id
      WHERE rs."rubricId" = '${rubricId}' ${groupFilter}
      GROUP BY s."personId", s."assessedAt"
    )
    SELECT "assessedAt" as assessed_at, FLOOR(avg_step / 5) * 5 as bucket, COUNT(*) as count
    FROM person_period_avgs
    GROUP BY "assessedAt", bucket ORDER BY "assessedAt", bucket
  `);

  const statsRows = await prisma.$queryRawUnsafe<
    {
      assessed_at: Date; mean: number; median: number; stddev: number;
      p25: number; p75: number; count: bigint; above_goal: bigint;
    }[]
  >(`
    WITH person_period_avgs AS (
      SELECT s."personId", s."assessedAt", AVG(s.value) as avg_step
      FROM "Step" s
      JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
      JOIN "Person" p ON s."personId" = p.id
      WHERE rs."rubricId" = '${rubricId}' ${groupFilter}
      GROUP BY s."personId", s."assessedAt"
    )
    SELECT "assessedAt" as assessed_at,
      AVG(avg_step) as mean, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY avg_step) as median,
      COALESCE(STDDEV(avg_step), 0) as stddev, PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY avg_step) as p25,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY avg_step) as p75, COUNT(*) as count,
      COUNT(CASE WHEN avg_step >= ${goal} THEN 1 END) as above_goal
    FROM person_period_avgs
    GROUP BY "assessedAt" ORDER BY "assessedAt"
  `);

  const byPeriod: Record<string, { bucket: number; count: bigint }[]> = {};
  for (const row of bucketRows) {
    const key = row.assessed_at.toISOString().split("T")[0];
    if (!byPeriod[key]) byPeriod[key] = [];
    byPeriod[key].push({ bucket: row.bucket, count: row.count });
  }

  return statsRows.map((sr) => {
    const key = sr.assessed_at.toISOString().split("T")[0];
    const label = sr.assessed_at.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    return { key: label, rawKey: key, buckets: buildBucketsFromRaw(byPeriod[key] || []), stats: buildStats(sr, goal) };
  });
}

// --- Drill-down distribution queries ---

export async function getDistributionDrillSkill(
  rubricId: string,
  skillName: string,
  filters: DashboardFilters,
  goals: RubricGoal
): Promise<ScopedDistribution[]> {
  const where = buildWhereClause(rubricId, filters);

  // Raw values per sub-score — need per-sub-score goals so compute in app code
  const rawRows = await prisma.$queryRawUnsafe<
    { sub_score_id: string; sub_score_name: string; value: number }[]
  >(`
    SELECT ss.id as sub_score_id, ss.name as sub_score_name, s.value
    FROM "Step" s
    JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
    JOIN "SubScore" ss ON s."subScoreId" = ss.id
    JOIN "Skill" sk ON ss."skillId" = sk.id
    JOIN "Person" p ON s."personId" = p.id
    WHERE ${where} AND sk.name = '${skillName.replace(/'/g, "''")}'
  `);

  const bySubScore: Record<string, { id: string; values: number[] }> = {};
  for (const row of rawRows) {
    if (!bySubScore[row.sub_score_name]) bySubScore[row.sub_score_name] = { id: row.sub_score_id, values: [] };
    bySubScore[row.sub_score_name].values.push(Number(row.value));
  }

  return Object.entries(bySubScore)
    .map(([name, { id, values }]) => {
      const goal = goals.subScoreGoals[id] ?? goals.rubricGoal;
      return { key: name, buckets: computeBuckets(values), stats: computeStatsFromAvgs(values, goal) };
    })
    .sort((a, b) => b.stats.mean - a.stats.mean);
}

export async function getDistributionDrillGroup(
  rubricId: string,
  groupName: string,
  filters: DashboardFilters,
  goals: RubricGoal
): Promise<ScopedDistribution[]> {
  const dateFilter = [
    filters.dateFrom ? `AND s."assessedAt" >= '${filters.dateFrom}'` : "",
    filters.dateTo ? `AND s."assessedAt" <= '${filters.dateTo}'` : "",
  ].join(" ");

  const rawRows = await prisma.$queryRawUnsafe<
    { skill_name: string; avg_step: number }[]
  >(`
    SELECT sk.name as skill_name, AVG(s.value) as avg_step
    FROM "Step" s
    JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
    JOIN "SubScore" ss ON s."subScoreId" = ss.id
    JOIN "Skill" sk ON ss."skillId" = sk.id
    JOIN "Person" p ON s."personId" = p.id
    JOIN "Group" g ON p."groupId" = g.id
    WHERE rs."rubricId" = '${rubricId}' AND g.name = '${groupName.replace(/'/g, "''")}' ${dateFilter}
    GROUP BY s."personId", sk.name
  `);

  const bySkill: Record<string, number[]> = {};
  for (const row of rawRows) {
    if (!bySkill[row.skill_name]) bySkill[row.skill_name] = [];
    bySkill[row.skill_name].push(Number(row.avg_step));
  }

  return Object.entries(bySkill)
    .map(([skillName, avgs]) => {
      const goal = goals.skillGoals[skillName] ?? goals.rubricGoal;
      return { key: skillName, buckets: computeBuckets(avgs), stats: computeStatsFromAvgs(avgs, goal) };
    })
    .sort((a, b) => b.stats.mean - a.stats.mean);
}

export async function getDistributionDrillPeriod(
  rubricId: string,
  periodDate: string,
  filters: DashboardFilters,
  goals: RubricGoal
): Promise<ScopedDistribution[]> {
  const groupFilter =
    filters.groupIds && filters.groupIds.length > 0
      ? `AND p."groupId" IN (${filters.groupIds.map((id) => `'${id}'`).join(",")})`
      : "";

  const rawRows = await prisma.$queryRawUnsafe<
    { skill_name: string; avg_step: number }[]
  >(`
    SELECT sk.name as skill_name, AVG(s.value) as avg_step
    FROM "Step" s
    JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
    JOIN "SubScore" ss ON s."subScoreId" = ss.id
    JOIN "Skill" sk ON ss."skillId" = sk.id
    JOIN "Person" p ON s."personId" = p.id
    WHERE rs."rubricId" = '${rubricId}' AND s."assessedAt"::date = '${periodDate}' ${groupFilter}
    GROUP BY s."personId", sk.name
  `);

  const bySkill: Record<string, number[]> = {};
  for (const row of rawRows) {
    if (!bySkill[row.skill_name]) bySkill[row.skill_name] = [];
    bySkill[row.skill_name].push(Number(row.avg_step));
  }

  return Object.entries(bySkill)
    .map(([skillName, avgs]) => {
      const goal = goals.skillGoals[skillName] ?? goals.rubricGoal;
      return { key: skillName, buckets: computeBuckets(avgs), stats: computeStatsFromAvgs(avgs, goal) };
    })
    .sort((a, b) => b.stats.mean - a.stats.mean);
}
