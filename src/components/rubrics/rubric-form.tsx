"use client";

import { useState } from "react";
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
    goalScore: number;
    subScoreGoals: Record<string, number>;
  };
}

export function RubricForm({ skills, action, defaultValues }: RubricFormProps) {
  const [goalScore, setGoalScore] = useState(defaultValues?.goalScore ?? 70);
  const [subScoreGoals, setSubScoreGoals] = useState<Record<string, number>>(
    defaultValues?.subScoreGoals ?? {}
  );
  const [showPerSubScore, setShowPerSubScore] = useState(
    Object.keys(defaultValues?.subScoreGoals ?? {}).length > 0
  );

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

      <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
        <div className="space-y-2">
          <Label htmlFor="goalScore">Standard / Goal Score</Label>
          <p className="text-sm text-muted-foreground">
            The target score for this rubric (0-100). People scoring at or above this are &ldquo;meeting the standard&rdquo;.
          </p>
          <div className="flex items-center gap-4 max-w-xs">
            <Input
              id="goalScore"
              name="goalScore"
              type="number"
              min={0}
              max={100}
              step={1}
              value={goalScore}
              onChange={(e) => setGoalScore(Number(e.target.value))}
              className="w-24"
            />
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${goalScore}%` }}
              />
            </div>
            <span className="text-sm font-mono text-muted-foreground w-8">{goalScore}</span>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showPerSubScore}
            onChange={(e) => {
              setShowPerSubScore(e.target.checked);
              if (!e.target.checked) setSubScoreGoals({});
            }}
            className="rounded border-muted-foreground"
          />
          <span className="text-sm">Customize goals per sub-score</span>
        </label>
      </div>

      <input type="hidden" name="subScoreGoals" value={JSON.stringify(subScoreGoals)} />

      <div className="space-y-2">
        <Label>Sub-Scores</Label>
        <p className="text-sm text-muted-foreground">
          Select the sub-scores that make up this rubric. You can select entire
          skills or individual sub-scores.
        </p>
        <SubScorePicker
          skills={skills}
          defaultSelected={defaultValues?.selectedSubScoreIds}
          showGoals={showPerSubScore}
          rubricGoal={goalScore}
          subScoreGoals={subScoreGoals}
          onSubScoreGoalChange={(id, val) => {
            setSubScoreGoals((prev) => {
              if (val === null) {
                const next = { ...prev };
                delete next[id];
                return next;
              }
              return { ...prev, [id]: val };
            });
          }}
        />
      </div>

      <Button type="submit" size="lg">
        {defaultValues ? "Update Rubric" : "Create Rubric"}
      </Button>
    </form>
  );
}
