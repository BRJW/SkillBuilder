"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubScorePicker } from "./sub-score-picker";

interface Skill {
  id: string;
  name: string;
  subScores: { id: string; name: string }[];
}

interface RubricFormProps {
  skills: Skill[];
  action: (formData: FormData) => Promise<void>;
  defaultValues?: {
    name: string;
    description: string | null;
    selectedSubScoreIds: string[];
  };
}

export function RubricForm({ skills, action, defaultValues }: RubricFormProps) {
  return (
    <form action={action} className="space-y-8 max-w-3xl">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Rubric Name</Label>
          <Input
            id="name"
            name="name"
            required
            placeholder="e.g., Communication Skills"
            defaultValue={defaultValues?.name}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="What does this rubric measure?"
            defaultValue={defaultValues?.description || ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Sub-Scores</Label>
        <p className="text-sm text-muted-foreground">
          Select the sub-scores that make up this rubric. You can select entire
          skills or individual sub-scores.
        </p>
        <SubScorePicker
          skills={skills}
          defaultSelected={defaultValues?.selectedSubScoreIds}
        />
      </div>

      <Button type="submit" size="lg">
        {defaultValues ? "Update Rubric" : "Create Rubric"}
      </Button>
    </form>
  );
}
