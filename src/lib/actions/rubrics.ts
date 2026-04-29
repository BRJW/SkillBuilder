"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createRubric(formData: FormData) {
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const subScoreIds = formData.getAll("subScoreIds") as string[];
  const goalScore = parseFloat(formData.get("goalScore") as string) || 70;
  const subScoreGoalsRaw = formData.get("subScoreGoals") as string;
  const subScoreGoals: Record<string, number> = subScoreGoalsRaw ? JSON.parse(subScoreGoalsRaw) : {};

  if (!name || subScoreIds.length === 0) {
    throw new Error("Name and at least one sub-score are required");
  }

  await prisma.rubric.create({
    data: {
      name,
      description,
      goalScore,
      subScores: {
        create: subScoreIds.map((subScoreId) => ({
          subScoreId,
          goalScore: subScoreGoals[subScoreId] != null ? subScoreGoals[subScoreId] : null,
        })),
      },
    },
  });

  revalidatePath("/rubrics");
  redirect(`/rubrics`);
}

export async function updateRubric(rubricId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const subScoreIds = formData.getAll("subScoreIds") as string[];
  const goalScore = parseFloat(formData.get("goalScore") as string) || 70;
  const subScoreGoalsRaw = formData.get("subScoreGoals") as string;
  const subScoreGoals: Record<string, number> = subScoreGoalsRaw ? JSON.parse(subScoreGoalsRaw) : {};

  if (!name || subScoreIds.length === 0) {
    throw new Error("Name and at least one sub-score are required");
  }

  await prisma.$transaction([
    prisma.rubricSubScore.deleteMany({ where: { rubricId } }),
    prisma.rubric.update({
      where: { id: rubricId },
      data: {
        name,
        description,
        goalScore,
        subScores: {
          create: subScoreIds.map((subScoreId) => ({
            subScoreId,
            goalScore: subScoreGoals[subScoreId] != null ? subScoreGoals[subScoreId] : null,
          })),
        },
      },
    }),
  ]);

  revalidatePath("/rubrics");
  redirect("/rubrics");
}

export async function deleteRubric(rubricId: string) {
  await prisma.rubric.delete({ where: { id: rubricId } });
  revalidatePath("/rubrics");
  redirect("/rubrics");
}
