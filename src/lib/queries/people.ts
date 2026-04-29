import { prisma } from "@/lib/prisma";
import type { DashboardFilters, PersonWithScore, SubScoreDetail } from "@/lib/types";

export async function getPeopleByRubric(
  rubricId: string,
  filters: DashboardFilters
): Promise<PersonWithScore[]> {
  const schoolFilter =
    filters.schoolIds && filters.schoolIds.length > 0
      ? `AND p."schoolId" IN (${filters.schoolIds.map((id) => `'${id}'`).join(",")})`
      : "";
  const dateFilter = [
    filters.dateFrom ? `AND s."assessedAt" >= '${filters.dateFrom}'` : "",
    filters.dateTo ? `AND s."assessedAt" <= '${filters.dateTo}'` : "",
  ].join(" ");

  const result = await prisma.$queryRawUnsafe<
    {
      id: string;
      first_name: string;
      last_name: string;
      school_name: string;
      average_score: number;
      score_count: bigint;
    }[]
  >(`
    SELECT
      p.id,
      p."firstName" as first_name,
      p."lastName" as last_name,
      sch.name as school_name,
      AVG(s.value) as average_score,
      COUNT(s.id) as score_count
    FROM "Person" p
    JOIN "School" sch ON p."schoolId" = sch.id
    JOIN "Score" s ON s."personId" = p.id
    JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
    WHERE rs."rubricId" = '${rubricId}' ${schoolFilter} ${dateFilter}
    GROUP BY p.id, p."firstName", p."lastName", sch.name
    ORDER BY average_score DESC
  `);

  return result.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    schoolName: row.school_name,
    averageScore: Math.round(row.average_score * 10) / 10,
    scoreCount: Number(row.score_count),
  }));
}

export async function getPersonScores(
  personId: string,
  rubricId: string
): Promise<SubScoreDetail[]> {
  const scores = await prisma.score.findMany({
    where: {
      personId,
      subScore: {
        rubricSubScores: {
          some: { rubricId },
        },
      },
    },
    include: {
      subScore: {
        include: { skill: true },
      },
    },
    orderBy: { assessedAt: "asc" },
  });

  // Group by sub-score
  const grouped: Record<string, SubScoreDetail> = {};
  for (const score of scores) {
    const key = score.subScoreId;
    if (!grouped[key]) {
      grouped[key] = {
        subScoreId: score.subScoreId,
        subScoreName: score.subScore.name,
        skillName: score.subScore.skill.name,
        values: [],
      };
    }
    grouped[key].values.push({
      assessedAt: score.assessedAt.toISOString().split("T")[0],
      value: score.value,
    });
  }

  return Object.values(grouped).sort((a, b) =>
    a.skillName.localeCompare(b.skillName) ||
    a.subScoreName.localeCompare(b.subScoreName)
  );
}

export async function getPersonById(personId: string) {
  return prisma.person.findUnique({
    where: { id: personId },
    include: { school: true },
  });
}
