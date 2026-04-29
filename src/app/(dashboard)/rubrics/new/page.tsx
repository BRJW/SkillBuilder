export const dynamic = "force-dynamic";

import { getSkillsWithSubScores } from "@/lib/queries/rubrics";
import { createRubric } from "@/lib/actions/rubrics";
import { RubricForm } from "@/components/rubrics/rubric-form";

export default async function NewRubricPage() {
  const skills = await getSkillsWithSubScores();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Create Rubric
        </h1>
        <p className="text-muted-foreground">
          Define a new rubric by selecting which skills and sub-scores to
          include.
        </p>
      </div>
      <RubricForm skills={skills} action={createRubric} />
    </div>
  );
}
