"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
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
}: {
  skills: Skill[];
  defaultSelected?: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(defaultSelected)
  );

  function toggleSubScore(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
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
            <div className="ml-6 grid grid-cols-2 gap-2">
              {skill.subScores.map((subScore) => (
                <div key={subScore.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`ss-${subScore.id}`}
                    checked={selected.has(subScore.id)}
                    onCheckedChange={() => toggleSubScore(subScore.id)}
                  />
                  <Label
                    htmlFor={`ss-${subScore.id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {subScore.name}
                  </Label>
                  {/* Hidden input for form submission */}
                  {selected.has(subScore.id) && (
                    <input
                      type="hidden"
                      name="subScoreIds"
                      value={subScore.id}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
