import { prisma } from "@/lib/prisma";

export async function getRubrics() {
  return prisma.rubric.findMany({
    include: {
      subScores: {
        include: {
          subScore: {
            include: { skill: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRubricById(id: string) {
  return prisma.rubric.findUnique({
    where: { id },
    include: {
      subScores: {
        include: {
          subScore: {
            include: { skill: true },
          },
        },
      },
    },
  });
}

export async function getSkillsWithSubScores() {
  return prisma.skill.findMany({
    include: {
      subScores: {
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
}
