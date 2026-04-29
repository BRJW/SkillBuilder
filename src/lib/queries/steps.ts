import { prisma } from "@/lib/prisma";
import type {
  DashboardFilters,
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

export async function getAggregateStats(
  rubricId: string,
  filters: DashboardFilters
): Promise<RubricStats> {
  const where = buildWhereClause(rubricId, filters);

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
      PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY pa.avg_step) as p90
    FROM person_avgs pa
    CROSS JOIN total t
    GROUP BY t.total_people
  `);

  if (!result.length || result[0].mean === null) {
    return {
      completionRate: 0,
      totalPeople: 0,
      assessedPeople: 0,
      mean: 0,
      median: 0,
      p10: 0,
      p25: 0,
      p75: 0,
      p90: 0,
    };
  }

  const row = result[0];
  const totalPeople = Number(row.total_people);
  const assessedPeople = Number(row.assessed_people);

  return {
    completionRate: totalPeople > 0 ? (assessedPeople / totalPeople) * 100 : 0,
    totalPeople,
    assessedPeople,
    mean: Math.round((row.mean ?? 0) * 10) / 10,
    median: Math.round((row.median ?? 0) * 10) / 10,
    p10: Math.round((row.p10 ?? 0) * 10) / 10,
    p25: Math.round((row.p25 ?? 0) * 10) / 10,
    p75: Math.round((row.p75 ?? 0) * 10) / 10,
    p90: Math.round((row.p90 ?? 0) * 10) / 10,
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

  const buckets: DistributionBucket[] = [];
  for (let i = 0; i <= 95; i += 5) {
    const found = result.find((r) => Number(r.bucket) === i);
    buckets.push({
      rangeStart: i,
      rangeEnd: i + 5,
      label: `${i}`,
      count: found ? Number(found.count) : 0,
    });
  }
  return buckets;
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
    {
      assessed_at: Date;
      p10: number;
      p25: number;
      p50: number;
      p75: number;
      p90: number;
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
    p10: Math.round(row.p10 * 10) / 10,
    p25: Math.round(row.p25 * 10) / 10,
    p50: Math.round(row.p50 * 10) / 10,
    p75: Math.round(row.p75 * 10) / 10,
    p90: Math.round(row.p90 * 10) / 10,
  }));
}

export async function getSubScoreAverages(
  rubricId: string,
  filters: DashboardFilters
): Promise<SubScoreAverage[]> {
  const where = buildWhereClause(rubricId, filters);

  const result = await prisma.$queryRawUnsafe<
    {
      sub_score_id: string;
      sub_score_name: string;
      skill_name: string;
      average: number;
    }[]
  >(`
    SELECT
      ss.id as sub_score_id,
      ss.name as sub_score_name,
      sk.name as skill_name,
      AVG(s.value) as average
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
    subScoreId: row.sub_score_id,
    subScoreName: row.sub_score_name,
    skillName: row.skill_name,
    average: Math.round(row.average * 10) / 10,
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
    SELECT
      sk.name as skill_name,
      AVG(s.value) as average
    FROM "Step" s
    JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
    JOIN "SubScore" ss ON s."subScoreId" = ss.id
    JOIN "Skill" sk ON ss."skillId" = sk.id
    JOIN "Person" p ON s."personId" = p.id
    WHERE ${where}
    GROUP BY sk.name
    ORDER BY sk.name
  `);

  return result.map((row) => ({
    skillName: row.skill_name,
    average: Math.round(row.average * 10) / 10,
  }));
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
    SELECT
      g.name as group_name,
      AVG(s.value) as average,
      COUNT(DISTINCT s."personId") as count
    FROM "Step" s
    JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
    JOIN "Person" p ON s."personId" = p.id
    JOIN "Group" g ON p."groupId" = g.id
    WHERE rs."rubricId" = '${rubricId}' ${dateFilter}
    GROUP BY g.name
    ORDER BY average DESC
  `);

  return result.map((row) => ({
    groupName: row.group_name,
    average: Math.round(row.average * 10) / 10,
    count: Number(row.count),
  }));
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
    SELECT
      p."firstName" as first_name,
      p."lastName" as last_name,
      g.name as group_name,
      AVG(s.value) as avg_step
    FROM "Step" s
    JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
    JOIN "Person" p ON s."personId" = p.id
    JOIN "Group" g ON p."groupId" = g.id
    WHERE ${where}
    GROUP BY p.id, p."firstName", p."lastName", g.name
    ORDER BY avg_step DESC
  `);

  const mapped = result.map((r) => ({
    name: `${r.first_name} ${r.last_name}`,
    groupName: r.group_name,
    avg: Math.round(r.avg_step * 10) / 10,
  }));

  return {
    top: mapped.slice(0, limit),
    bottom: mapped.slice(-limit).reverse(),
  };
}

// --- Trend queries: compare latest period vs previous period ---

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
    SELECT
      g.name as group_name,
      s."assessedAt" as assessed_at,
      AVG(s.value) as average,
      COUNT(DISTINCT s."personId") as count
    FROM "Step" s
    JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
    JOIN "Person" p ON s."personId" = p.id
    JOIN "Group" g ON p."groupId" = g.id
    WHERE rs."rubricId" = '${rubricId}' ${dateFilter}
    GROUP BY g.name, s."assessedAt"
    ORDER BY g.name, s."assessedAt"
  `);

  // Group by name, get last two periods
  const byGroup: Record<string, { date: Date; avg: number; count: number }[]> = {};
  for (const row of result) {
    const key = row.group_name;
    if (!byGroup[key]) byGroup[key] = [];
    byGroup[key].push({ date: row.assessed_at, avg: Number(row.average), count: Number(row.count) });
  }

  return Object.entries(byGroup).map(([groupName, periods]) => {
    const current = periods[periods.length - 1];
    const previous = periods.length >= 2 ? periods[periods.length - 2] : current;
    return {
      groupName,
      current: Math.round(current.avg * 10) / 10,
      previous: Math.round(previous.avg * 10) / 10,
      change: Math.round((current.avg - previous.avg) * 10) / 10,
      count: current.count,
    };
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
    SELECT
      sk.name as skill_name,
      s."assessedAt" as assessed_at,
      AVG(s.value) as average
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
    return {
      skillName,
      current: Math.round(current.avg * 10) / 10,
      previous: Math.round(previous.avg * 10) / 10,
      change: Math.round((current.avg - previous.avg) * 10) / 10,
    };
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
    SELECT
      "assessedAt" as assessed_at,
      AVG(avg_step) as mean,
      COALESCE(STDDEV(avg_step), 0) as stddev,
      COUNT(*) as count
    FROM person_period_avgs
    GROUP BY "assessedAt"
    ORDER BY "assessedAt"
  `);

  return result.map((row) => ({
    assessedAt: row.assessed_at.toISOString().split("T")[0],
    mean: Math.round(Number(row.mean) * 10) / 10,
    stdDev: Math.round(Number(row.stddev) * 10) / 10,
    count: Number(row.count),
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
    SELECT
      sk.name as skill_name,
      s."assessedAt" as assessed_at,
      AVG(s.value) as average,
      COUNT(DISTINCT s."personId") as count
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
    bySkill[row.skill_name].push({
      date: row.assessed_at.toISOString().split("T")[0],
      average: Math.round(Number(row.average) * 10) / 10,
      count: Number(row.count),
    });
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
    SELECT
      sk.name as skill_name,
      ss.name as sub_score_name,
      s."assessedAt" as assessed_at,
      AVG(s.value) as average
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
    if (!byKey[key]) {
      byKey[key] = [];
      keyMeta[key] = { skillName: row.skill_name, subScoreName: row.sub_score_name };
    }
    byKey[key].push({
      date: row.assessed_at.toISOString().split("T")[0],
      average: Math.round(Number(row.average) * 10) / 10,
    });
  }

  return Object.entries(byKey).map(([key, periods]) => ({
    ...keyMeta[key],
    periods,
  }));
}

export async function getGoalAttainment(
  rubricId: string,
  filters: DashboardFilters
): Promise<GoalAttainmentRow[]> {
  const groupFilter =
    filters.groupIds && filters.groupIds.length > 0
      ? `AND p."groupId" IN (${filters.groupIds.map((id) => `'${id}'`).join(",")})`
      : "";

  const result = await prisma.$queryRawUnsafe<
    {
      assessed_at: Date;
      total: bigint;
      above_50: bigint;
      above_60: bigint;
      above_70: bigint;
      above_80: bigint;
      above_90: bigint;
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
    SELECT
      "assessedAt" as assessed_at,
      COUNT(*) as total,
      COUNT(CASE WHEN avg_step >= 50 THEN 1 END) as above_50,
      COUNT(CASE WHEN avg_step >= 60 THEN 1 END) as above_60,
      COUNT(CASE WHEN avg_step >= 70 THEN 1 END) as above_70,
      COUNT(CASE WHEN avg_step >= 80 THEN 1 END) as above_80,
      COUNT(CASE WHEN avg_step >= 90 THEN 1 END) as above_90
    FROM person_period_avgs
    GROUP BY "assessedAt"
    ORDER BY "assessedAt"
  `);

  return result.map((row) => {
    const d = row.assessed_at;
    return {
      date: d.toISOString().split("T")[0],
      label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      total: Number(row.total),
      above50: Number(row.above_50),
      above60: Number(row.above_60),
      above70: Number(row.above_70),
      above80: Number(row.above_80),
      above90: Number(row.above_90),
    };
  });
}

// --- Scoped distribution queries ---

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
    above_50: bigint; above_60: bigint; above_70: bigint; above_80: bigint;
  }
) {
  const count = Number(statsRow.count);
  return {
    mean: Math.round(Number(statsRow.mean) * 10) / 10,
    median: Math.round(Number(statsRow.median) * 10) / 10,
    stdDev: Math.round(Number(statsRow.stddev) * 10) / 10,
    p25: Math.round(Number(statsRow.p25) * 10) / 10,
    p75: Math.round(Number(statsRow.p75) * 10) / 10,
    count,
    pctAbove50: count > 0 ? Math.round((Number(statsRow.above_50) / count) * 1000) / 10 : 0,
    pctAbove60: count > 0 ? Math.round((Number(statsRow.above_60) / count) * 1000) / 10 : 0,
    pctAbove70: count > 0 ? Math.round((Number(statsRow.above_70) / count) * 1000) / 10 : 0,
    pctAbove80: count > 0 ? Math.round((Number(statsRow.above_80) / count) * 1000) / 10 : 0,
  };
}

export async function getDistributionBySkill(
  rubricId: string,
  filters: DashboardFilters
): Promise<ScopedDistribution[]> {
  const where = buildWhereClause(rubricId, filters);

  const bucketRows = await prisma.$queryRawUnsafe<
    { skill_name: string; bucket: number; count: bigint }[]
  >(`
    WITH person_skill_avgs AS (
      SELECT s."personId", sk.name as skill_name, AVG(s.value) as avg_step
      FROM "Step" s
      JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
      JOIN "SubScore" ss ON s."subScoreId" = ss.id
      JOIN "Skill" sk ON ss."skillId" = sk.id
      JOIN "Person" p ON s."personId" = p.id
      WHERE ${where}
      GROUP BY s."personId", sk.name
    )
    SELECT skill_name, FLOOR(avg_step / 5) * 5 as bucket, COUNT(*) as count
    FROM person_skill_avgs
    GROUP BY skill_name, bucket
    ORDER BY skill_name, bucket
  `);

  const statsRows = await prisma.$queryRawUnsafe<
    {
      skill_name: string; mean: number; median: number; stddev: number;
      p25: number; p75: number; count: bigint;
      above_50: bigint; above_60: bigint; above_70: bigint; above_80: bigint;
    }[]
  >(`
    WITH person_skill_avgs AS (
      SELECT s."personId", sk.name as skill_name, AVG(s.value) as avg_step
      FROM "Step" s
      JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
      JOIN "SubScore" ss ON s."subScoreId" = ss.id
      JOIN "Skill" sk ON ss."skillId" = sk.id
      JOIN "Person" p ON s."personId" = p.id
      WHERE ${where}
      GROUP BY s."personId", sk.name
    )
    SELECT
      skill_name,
      AVG(avg_step) as mean,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY avg_step) as median,
      COALESCE(STDDEV(avg_step), 0) as stddev,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY avg_step) as p25,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY avg_step) as p75,
      COUNT(*) as count,
      COUNT(CASE WHEN avg_step >= 50 THEN 1 END) as above_50,
      COUNT(CASE WHEN avg_step >= 60 THEN 1 END) as above_60,
      COUNT(CASE WHEN avg_step >= 70 THEN 1 END) as above_70,
      COUNT(CASE WHEN avg_step >= 80 THEN 1 END) as above_80
    FROM person_skill_avgs
    GROUP BY skill_name
    ORDER BY skill_name
  `);

  const bySkill: Record<string, { bucket: number; count: bigint }[]> = {};
  for (const row of bucketRows) {
    if (!bySkill[row.skill_name]) bySkill[row.skill_name] = [];
    bySkill[row.skill_name].push({ bucket: row.bucket, count: row.count });
  }

  return statsRows.map((sr) => ({
    key: sr.skill_name,
    buckets: buildBucketsFromRaw(bySkill[sr.skill_name] || []),
    stats: buildStats(sr),
  }));
}

export async function getDistributionByGroup(
  rubricId: string,
  filters: DashboardFilters
): Promise<ScopedDistribution[]> {
  const dateFilter = [
    filters.dateFrom ? `AND s."assessedAt" >= '${filters.dateFrom}'` : "",
    filters.dateTo ? `AND s."assessedAt" <= '${filters.dateTo}'` : "",
  ].join(" ");

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
    GROUP BY group_name, bucket
    ORDER BY group_name, bucket
  `);

  const statsRows = await prisma.$queryRawUnsafe<
    {
      group_name: string; mean: number; median: number; stddev: number;
      p25: number; p75: number; count: bigint;
      above_50: bigint; above_60: bigint; above_70: bigint; above_80: bigint;
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
    SELECT
      group_name,
      AVG(avg_step) as mean,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY avg_step) as median,
      COALESCE(STDDEV(avg_step), 0) as stddev,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY avg_step) as p25,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY avg_step) as p75,
      COUNT(*) as count,
      COUNT(CASE WHEN avg_step >= 50 THEN 1 END) as above_50,
      COUNT(CASE WHEN avg_step >= 60 THEN 1 END) as above_60,
      COUNT(CASE WHEN avg_step >= 70 THEN 1 END) as above_70,
      COUNT(CASE WHEN avg_step >= 80 THEN 1 END) as above_80
    FROM person_group_avgs
    GROUP BY group_name
    ORDER BY mean DESC
  `);

  const byGroup: Record<string, { bucket: number; count: bigint }[]> = {};
  for (const row of bucketRows) {
    if (!byGroup[row.group_name]) byGroup[row.group_name] = [];
    byGroup[row.group_name].push({ bucket: row.bucket, count: row.count });
  }

  return statsRows.map((sr) => ({
    key: sr.group_name,
    buckets: buildBucketsFromRaw(byGroup[sr.group_name] || []),
    stats: buildStats(sr),
  }));
}

export async function getDistributionByPeriod(
  rubricId: string,
  filters: DashboardFilters
): Promise<ScopedDistribution[]> {
  const groupFilter =
    filters.groupIds && filters.groupIds.length > 0
      ? `AND p."groupId" IN (${filters.groupIds.map((id) => `'${id}'`).join(",")})`
      : "";

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
    GROUP BY "assessedAt", bucket
    ORDER BY "assessedAt", bucket
  `);

  const statsRows = await prisma.$queryRawUnsafe<
    {
      assessed_at: Date; mean: number; median: number; stddev: number;
      p25: number; p75: number; count: bigint;
      above_50: bigint; above_60: bigint; above_70: bigint; above_80: bigint;
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
    SELECT
      "assessedAt" as assessed_at,
      AVG(avg_step) as mean,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY avg_step) as median,
      COALESCE(STDDEV(avg_step), 0) as stddev,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY avg_step) as p25,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY avg_step) as p75,
      COUNT(*) as count,
      COUNT(CASE WHEN avg_step >= 50 THEN 1 END) as above_50,
      COUNT(CASE WHEN avg_step >= 60 THEN 1 END) as above_60,
      COUNT(CASE WHEN avg_step >= 70 THEN 1 END) as above_70,
      COUNT(CASE WHEN avg_step >= 80 THEN 1 END) as above_80
    FROM person_period_avgs
    GROUP BY "assessedAt"
    ORDER BY "assessedAt"
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
    return {
      key: label,
      rawKey: key,
      buckets: buildBucketsFromRaw(byPeriod[key] || []),
      stats: buildStats(sr),
    };
  });
}

// --- Drill-down distribution queries ---

export async function getDistributionDrillSkill(
  rubricId: string,
  skillName: string,
  filters: DashboardFilters
): Promise<ScopedDistribution[]> {
  const where = buildWhereClause(rubricId, filters);

  const bucketRows = await prisma.$queryRawUnsafe<
    { sub_score_name: string; bucket: number; count: bigint }[]
  >(`
    SELECT
      ss.name as sub_score_name,
      FLOOR(s.value / 5) * 5 as bucket,
      COUNT(*) as count
    FROM "Step" s
    JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
    JOIN "SubScore" ss ON s."subScoreId" = ss.id
    JOIN "Skill" sk ON ss."skillId" = sk.id
    JOIN "Person" p ON s."personId" = p.id
    WHERE ${where} AND sk.name = '${skillName.replace(/'/g, "''")}'
    GROUP BY ss.name, bucket
    ORDER BY ss.name, bucket
  `);

  const statsRows = await prisma.$queryRawUnsafe<
    {
      sub_score_name: string; mean: number; median: number; stddev: number;
      p25: number; p75: number; count: bigint;
      above_50: bigint; above_60: bigint; above_70: bigint; above_80: bigint;
    }[]
  >(`
    SELECT
      ss.name as sub_score_name,
      AVG(s.value) as mean,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY s.value) as median,
      COALESCE(STDDEV(s.value), 0) as stddev,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY s.value) as p25,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY s.value) as p75,
      COUNT(*) as count,
      COUNT(CASE WHEN s.value >= 50 THEN 1 END) as above_50,
      COUNT(CASE WHEN s.value >= 60 THEN 1 END) as above_60,
      COUNT(CASE WHEN s.value >= 70 THEN 1 END) as above_70,
      COUNT(CASE WHEN s.value >= 80 THEN 1 END) as above_80
    FROM "Step" s
    JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
    JOIN "SubScore" ss ON s."subScoreId" = ss.id
    JOIN "Skill" sk ON ss."skillId" = sk.id
    JOIN "Person" p ON s."personId" = p.id
    WHERE ${where} AND sk.name = '${skillName.replace(/'/g, "''")}'
    GROUP BY ss.name
    ORDER BY ss.name
  `);

  const bySubScore: Record<string, { bucket: number; count: bigint }[]> = {};
  for (const row of bucketRows) {
    if (!bySubScore[row.sub_score_name]) bySubScore[row.sub_score_name] = [];
    bySubScore[row.sub_score_name].push({ bucket: row.bucket, count: row.count });
  }

  return statsRows.map((sr) => ({
    key: sr.sub_score_name,
    buckets: buildBucketsFromRaw(bySubScore[sr.sub_score_name] || []),
    stats: buildStats(sr),
  }));
}

export async function getDistributionDrillGroup(
  rubricId: string,
  groupName: string,
  filters: DashboardFilters
): Promise<ScopedDistribution[]> {
  const dateFilter = [
    filters.dateFrom ? `AND s."assessedAt" >= '${filters.dateFrom}'` : "",
    filters.dateTo ? `AND s."assessedAt" <= '${filters.dateTo}'` : "",
  ].join(" ");

  const bucketRows = await prisma.$queryRawUnsafe<
    { skill_name: string; bucket: number; count: bigint }[]
  >(`
    WITH person_skill_avgs AS (
      SELECT s."personId", sk.name as skill_name, AVG(s.value) as avg_step
      FROM "Step" s
      JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
      JOIN "SubScore" ss ON s."subScoreId" = ss.id
      JOIN "Skill" sk ON ss."skillId" = sk.id
      JOIN "Person" p ON s."personId" = p.id
      JOIN "Group" g ON p."groupId" = g.id
      WHERE rs."rubricId" = '${rubricId}' AND g.name = '${groupName.replace(/'/g, "''")}' ${dateFilter}
      GROUP BY s."personId", sk.name
    )
    SELECT skill_name, FLOOR(avg_step / 5) * 5 as bucket, COUNT(*) as count
    FROM person_skill_avgs
    GROUP BY skill_name, bucket
    ORDER BY skill_name, bucket
  `);

  const statsRows = await prisma.$queryRawUnsafe<
    {
      skill_name: string; mean: number; median: number; stddev: number;
      p25: number; p75: number; count: bigint;
      above_50: bigint; above_60: bigint; above_70: bigint; above_80: bigint;
    }[]
  >(`
    WITH person_skill_avgs AS (
      SELECT s."personId", sk.name as skill_name, AVG(s.value) as avg_step
      FROM "Step" s
      JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
      JOIN "SubScore" ss ON s."subScoreId" = ss.id
      JOIN "Skill" sk ON ss."skillId" = sk.id
      JOIN "Person" p ON s."personId" = p.id
      JOIN "Group" g ON p."groupId" = g.id
      WHERE rs."rubricId" = '${rubricId}' AND g.name = '${groupName.replace(/'/g, "''")}' ${dateFilter}
      GROUP BY s."personId", sk.name
    )
    SELECT
      skill_name,
      AVG(avg_step) as mean,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY avg_step) as median,
      COALESCE(STDDEV(avg_step), 0) as stddev,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY avg_step) as p25,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY avg_step) as p75,
      COUNT(*) as count,
      COUNT(CASE WHEN avg_step >= 50 THEN 1 END) as above_50,
      COUNT(CASE WHEN avg_step >= 60 THEN 1 END) as above_60,
      COUNT(CASE WHEN avg_step >= 70 THEN 1 END) as above_70,
      COUNT(CASE WHEN avg_step >= 80 THEN 1 END) as above_80
    FROM person_skill_avgs
    GROUP BY skill_name
    ORDER BY skill_name
  `);

  const bySkill: Record<string, { bucket: number; count: bigint }[]> = {};
  for (const row of bucketRows) {
    if (!bySkill[row.skill_name]) bySkill[row.skill_name] = [];
    bySkill[row.skill_name].push({ bucket: row.bucket, count: row.count });
  }

  return statsRows.map((sr) => ({
    key: sr.skill_name,
    buckets: buildBucketsFromRaw(bySkill[sr.skill_name] || []),
    stats: buildStats(sr),
  }));
}

export async function getDistributionDrillPeriod(
  rubricId: string,
  periodDate: string,
  filters: DashboardFilters
): Promise<ScopedDistribution[]> {
  const groupFilter =
    filters.groupIds && filters.groupIds.length > 0
      ? `AND p."groupId" IN (${filters.groupIds.map((id) => `'${id}'`).join(",")})`
      : "";

  const bucketRows = await prisma.$queryRawUnsafe<
    { skill_name: string; bucket: number; count: bigint }[]
  >(`
    WITH person_skill_avgs AS (
      SELECT s."personId", sk.name as skill_name, AVG(s.value) as avg_step
      FROM "Step" s
      JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
      JOIN "SubScore" ss ON s."subScoreId" = ss.id
      JOIN "Skill" sk ON ss."skillId" = sk.id
      JOIN "Person" p ON s."personId" = p.id
      WHERE rs."rubricId" = '${rubricId}' AND s."assessedAt"::date = '${periodDate}' ${groupFilter}
      GROUP BY s."personId", sk.name
    )
    SELECT skill_name, FLOOR(avg_step / 5) * 5 as bucket, COUNT(*) as count
    FROM person_skill_avgs
    GROUP BY skill_name, bucket
    ORDER BY skill_name, bucket
  `);

  const statsRows = await prisma.$queryRawUnsafe<
    {
      skill_name: string; mean: number; median: number; stddev: number;
      p25: number; p75: number; count: bigint;
      above_50: bigint; above_60: bigint; above_70: bigint; above_80: bigint;
    }[]
  >(`
    WITH person_skill_avgs AS (
      SELECT s."personId", sk.name as skill_name, AVG(s.value) as avg_step
      FROM "Step" s
      JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
      JOIN "SubScore" ss ON s."subScoreId" = ss.id
      JOIN "Skill" sk ON ss."skillId" = sk.id
      JOIN "Person" p ON s."personId" = p.id
      WHERE rs."rubricId" = '${rubricId}' AND s."assessedAt"::date = '${periodDate}' ${groupFilter}
      GROUP BY s."personId", sk.name
    )
    SELECT
      skill_name,
      AVG(avg_step) as mean,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY avg_step) as median,
      COALESCE(STDDEV(avg_step), 0) as stddev,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY avg_step) as p25,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY avg_step) as p75,
      COUNT(*) as count,
      COUNT(CASE WHEN avg_step >= 50 THEN 1 END) as above_50,
      COUNT(CASE WHEN avg_step >= 60 THEN 1 END) as above_60,
      COUNT(CASE WHEN avg_step >= 70 THEN 1 END) as above_70,
      COUNT(CASE WHEN avg_step >= 80 THEN 1 END) as above_80
    FROM person_skill_avgs
    GROUP BY skill_name
    ORDER BY skill_name
  `);

  const bySkill: Record<string, { bucket: number; count: bigint }[]> = {};
  for (const row of bucketRows) {
    if (!bySkill[row.skill_name]) bySkill[row.skill_name] = [];
    bySkill[row.skill_name].push({ bucket: row.bucket, count: row.count });
  }

  return statsRows.map((sr) => ({
    key: sr.skill_name,
    buckets: buildBucketsFromRaw(bySkill[sr.skill_name] || []),
    stats: buildStats(sr),
  }));
}
