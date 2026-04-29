export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getRubricById, getSkillsWithSubScores } from "@/lib/queries/rubrics";
import { updateRubric } from "@/lib/actions/rubrics";
import { RubricForm } from "@/components/rubrics/rubric-form";

export default async function EditRubricPage({
  params,
}: {
  params: Promise<{ rubricId: string }>;
}) {
  const { rubricId } = await params;
  const [rubric, skills] = await Promise.all([
    getRubricById(rubricId),
    getSkillsWithSubScores(),
  ]);

  if (!rubric) {
    notFound();
  }

  const boundUpdate = updateRubric.bind(null, rubricId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Rubric</h1>
        <p className="text-muted-foreground">
          Update the rubric name, description, or sub-score selection.
        </p>
      </div>
      <RubricForm
        skills={skills}
        action={boundUpdate}
        defaultValues={{
          name: rubric.name,
          description: rubric.description,
          selectedSubScoreIds: rubric.subScores.map((rs) => rs.subScoreId),
          goalScore: rubric.goalScore,
          subScoreGoals: Object.fromEntries(
            rubric.subScores
              .filter((rs) => rs.goalScore != null)
              .map((rs) => [rs.subScoreId, rs.goalScore!])
          ),
        }}
      />
    </div>
  );
}
