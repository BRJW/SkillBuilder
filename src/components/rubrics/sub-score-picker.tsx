"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SKILL_COLORS } from "@/lib/constants";
import type { SkillName } from "@/lib/constants";

interface Skill {
  id: string;
  name: string;
  subScores: { id: string; name: string }[];
}

export function SubScorePicker({
  skills,
  defaultSelected = [],
  showGoals = false,
  rubricGoal = 70,
  subScoreGoals = {},
  onSubScoreGoalChange,
}: {
  skills: Skill[];
  defaultSelected?: string[];
  showGoals?: boolean;
  rubricGoal?: number;
  subScoreGoals?: Record<string, number>;
  onSubScoreGoalChange?: (subScoreId: string, value: number | null) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(defaultSelected)
  );

  function toggleSubScore(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        onSubScoreGoalChange?.(id, null);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSkill(skill: Skill) {
    const allIds = skill.subScores.map((s) => s.id);
    const allSelected = allIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of allIds) {
        if (allSelected) {
          next.delete(id);
          onSubScoreGoalChange?.(id, null);
        } else {
          next.add(id);
        }
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {selected.size} sub-scores selected
        </span>
      </div>

      {skills.map((skill) => {
        const skillColor =
          SKILL_COLORS[skill.name as SkillName] || "hsl(0, 0%, 50%)";
        const allSelected = skill.subScores.every((s) => selected.has(s.id));
        const someSelected = skill.subScores.some((s) => selected.has(s.id));

        return (
          <div key={skill.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`skill-${skill.id}`}
                checked={allSelected || someSelected}
                onCheckedChange={() => toggleSkill(skill)}
              />
              <Label
                htmlFor={`skill-${skill.id}`}
                className="text-sm font-semibold cursor-pointer"
              >
                {skill.name}
              </Label>
              <Badge
                variant="outline"
                style={{ borderColor: skillColor, color: skillColor }}
              >
                {skill.subScores.filter((s) => selected.has(s.id)).length}/
                {skill.subScores.length}
              </Badge>
            </div>
            <div className={`ml-6 grid gap-2 ${showGoals ? "grid-cols-1" : "grid-cols-2"}`}>
              {skill.subScores.map((subScore) => {
                const isSelected = selected.has(subScore.id);
                const hasOverride = subScoreGoals[subScore.id] != null;

                return (
                  <div
                    key={subScore.id}
                    className={`flex items-center gap-2 ${showGoals && isSelected ? "rounded-md border px-2 py-1.5 bg-background" : ""}`}
                  >
                    <Checkbox
                      id={`ss-${subScore.id}`}
                      checked={isSelected}
                      onCheckedChange={() => toggleSubScore(subScore.id)}
                    />
                    <Label
                      htmlFor={`ss-${subScore.id}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {subScore.name}
                    </Label>
                    {showGoals && isSelected && (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={hasOverride ? subScoreGoals[subScore.id] : ""}
                          placeholder={`${rubricGoal}`}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              onSubScoreGoalChange?.(subScore.id, null);
                            } else {
                              onSubScoreGoalChange?.(subScore.id, Number(val));
                            }
                          }}
                          className="w-16 h-7 text-xs text-center"
                        />
                        {hasOverride && (
                          <span className="text-[10px] text-muted-foreground">custom</span>
                        )}
                      </div>
                    )}
                    {isSelected && (
                      <input
                        type="hidden"
                        name="subScoreIds"
                        value={subScore.id}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
