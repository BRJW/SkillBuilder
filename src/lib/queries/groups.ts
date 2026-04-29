import { prisma } from "@/lib/prisma";

export async function getGroups() {
  return prisma.group.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, district: true },
  });
}

export async function getGroupsForRubric(rubricId: string) {
  return prisma.$queryRawUnsafe<{ id: string; name: string; district: string | null }[]>(`
    SELECT DISTINCT g.id, g.name, g.district
    FROM "Group" g
    JOIN "Person" p ON p."groupId" = g.id
    JOIN "Step" s ON s."personId" = p.id
    JOIN "RubricSubScore" rs ON s."subScoreId" = rs."subScoreId"
    WHERE rs."rubricId" = '${rubricId}'
    ORDER BY g.name
  `);
}
