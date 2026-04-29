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

export async function resolveRubricGoals(rubricId: string): Promise<import("@/lib/types").RubricGoal> {
  const rubric = await prisma.rubric.findUnique({
    where: { id: rubricId },
    include: {
      subScores: {
        include: { subScore: { include: { skill: true } } },
      },
    },
  });
  if (!rubric) throw new Error("Rubric not found");

  const rubricGoal = rubric.goalScore;
  const subScoreGoals: Record<string, number> = {};
  const skillSubScoreGoals: Record<string, number[]> = {};

  for (const rs of rubric.subScores) {
    const effective = rs.goalScore ?? rubricGoal;
    subScoreGoals[rs.subScoreId] = effective;
    const skillName = rs.subScore.skill.name;
    if (!skillSubScoreGoals[skillName]) skillSubScoreGoals[skillName] = [];
    skillSubScoreGoals[skillName].push(effective);
  }

  const skillGoals: Record<string, number> = {};
  for (const [skill, goals] of Object.entries(skillSubScoreGoals)) {
    skillGoals[skill] = goals.reduce((a, b) => a + b, 0) / goals.length;
  }

  return { rubricGoal, subScoreGoals, skillGoals };
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
