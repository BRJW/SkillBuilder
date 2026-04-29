import { prisma } from "@/lib/prisma";
import type { DashboardFilters, PersonWithSteps, SubScoreDetail } from "@/lib/types";

export async function getPeopleByRubric(
  rubricId: string,
  filters: DashboardFilters
): Promise<PersonWithSteps[]> {
  const groupFilter =
    filters.groupIds && filters.groupIds.length > 0
      ? `AND p."groupId" IN (${filters.groupIds.map((id) => `'${id}'`).join(",")})`
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
      group_name: string;
      average_step: number;
      step_count: bigint;
    }[]
  >(`
    SELECT
      p.id,
      p."firstName" as first_name,
      p."lastName" as last_name,
      g.name as group_name,
      AVG(s.value) as average_step,
      COUNT(s.id) as step_count
    FROM "Person" p
    JOIN "Group" g ON p."groupId" = g.id
    JOIN "Step" s ON s."personId" = p.id
    JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
    WHERE rs."rubricId" = '${rubricId}' ${groupFilter} ${dateFilter}
    GROUP BY p.id, p."firstName", p."lastName", g.name
    ORDER BY average_step DESC
  `);

  return result.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    groupName: row.group_name,
    averageStep: Math.round(row.average_step * 10) / 10,
    stepCount: Number(row.step_count),
  }));
}

export async function getPersonSteps(
  personId: string,
  rubricId: string
): Promise<SubScoreDetail[]> {
  const steps = await prisma.step.findMany({
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

  const grouped: Record<string, SubScoreDetail> = {};
  for (const step of steps) {
    const key = step.subScoreId;
    if (!grouped[key]) {
      grouped[key] = {
        subScoreId: step.subScoreId,
        subScoreName: step.subScore.name,
        skillName: step.subScore.skill.name,
        values: [],
      };
    }
    grouped[key].values.push({
      assessedAt: step.assessedAt.toISOString().split("T")[0],
      value: step.value,
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
    include: { group: true },
  });
}
