import { prisma } from "@/lib/prisma";
import type {
  DashboardFilters,
  RubricStats,
  PercentileBandPoint,
  DistributionBucket,
  SubScoreAverage,
} from "@/lib/types";

function buildWhereClause(rubricId: string, filters: DashboardFilters) {
  const conditions: string[] = [
    `rs."rubricId" = '${rubricId}'`,
  ];
  if (filters.schoolIds && filters.schoolIds.length > 0) {
    const ids = filters.schoolIds.map((id) => `'${id}'`).join(",");
    conditions.push(`p."schoolId" IN (${ids})`);
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

  // Get per-person average scores, then compute percentiles
  const result = await prisma.$queryRawUnsafe<
    {
      total_people: bigint;
      scored_people: bigint;
      mean: number | null;
      median: number | null;
      p10: number | null;
      p25: number | null;
      p75: number | null;
      p90: number | null;
    }[]
  >(`
    WITH person_avgs AS (
      SELECT s."personId", AVG(s.value) as avg_score
      FROM "Score" s
      JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
      JOIN "Person" p ON s."personId" = p.id
      WHERE ${where}
      GROUP BY s."personId"
    ),
    total AS (
      SELECT COUNT(DISTINCT p.id) as total_people
      FROM "Person" p
      ${filters.schoolIds && filters.schoolIds.length > 0 ? `WHERE p."schoolId" IN (${filters.schoolIds.map((id) => `'${id}'`).join(",")})` : ""}
    )
    SELECT
      t.total_people,
      COUNT(pa."personId") as scored_people,
      AVG(pa.avg_score) as mean,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pa.avg_score) as median,
      PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY pa.avg_score) as p10,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY pa.avg_score) as p25,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY pa.avg_score) as p75,
      PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY pa.avg_score) as p90
    FROM person_avgs pa
    CROSS JOIN total t
    GROUP BY t.total_people
  `);

  if (!result.length || result[0].mean === null) {
    return {
      completionRate: 0,
      totalPeople: 0,
      scoredPeople: 0,
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
  const scoredPeople = Number(row.scored_people);

  return {
    completionRate: totalPeople > 0 ? (scoredPeople / totalPeople) * 100 : 0,
    totalPeople,
    scoredPeople,
    mean: Math.round((row.mean ?? 0) * 10) / 10,
    median: Math.round((row.median ?? 0) * 10) / 10,
    p10: Math.round((row.p10 ?? 0) * 10) / 10,
    p25: Math.round((row.p25 ?? 0) * 10) / 10,
    p75: Math.round((row.p75 ?? 0) * 10) / 10,
    p90: Math.round((row.p90 ?? 0) * 10) / 10,
  };
}

export async function getScoreDistribution(
  rubricId: string,
  filters: DashboardFilters
): Promise<DistributionBucket[]> {
  const where = buildWhereClause(rubricId, filters);

  const result = await prisma.$queryRawUnsafe<
    { bucket: number; count: bigint }[]
  >(`
    WITH person_avgs AS (
      SELECT s."personId", AVG(s.value) as avg_score
      FROM "Score" s
      JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
      JOIN "Person" p ON s."personId" = p.id
      WHERE ${where}
      GROUP BY s."personId"
    )
    SELECT
      FLOOR(avg_score / 10) * 10 as bucket,
      COUNT(*) as count
    FROM person_avgs
    GROUP BY bucket
    ORDER BY bucket
  `);

  // Build complete 0-100 range
  const buckets: DistributionBucket[] = [];
  for (let i = 0; i <= 90; i += 10) {
    const found = result.find((r) => Number(r.bucket) === i);
    buckets.push({
      rangeStart: i,
      rangeEnd: i + 10,
      label: `${i}-${i + 10}`,
      count: found ? Number(found.count) : 0,
    });
  }
  return buckets;
}

export async function getPercentileBands(
  rubricId: string,
  filters: DashboardFilters
): Promise<PercentileBandPoint[]> {
  const schoolFilter =
    filters.schoolIds && filters.schoolIds.length > 0
      ? `AND p."schoolId" IN (${filters.schoolIds.map((id) => `'${id}'`).join(",")})`
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
      SELECT s."personId", s."assessedAt", AVG(s.value) as avg_score
      FROM "Score" s
      JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
      JOIN "Person" p ON s."personId" = p.id
      WHERE rs."rubricId" = '${rubricId}' ${schoolFilter}
      GROUP BY s."personId", s."assessedAt"
    )
    SELECT
      "assessedAt" as assessed_at,
      PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY avg_score) as p10,
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY avg_score) as p25,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY avg_score) as p50,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY avg_score) as p75,
      PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY avg_score) as p90
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
    FROM "Score" s
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
