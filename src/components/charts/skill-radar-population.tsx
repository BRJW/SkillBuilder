"use client";

import {
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SKILL_COLORS } from "@/lib/constants";
import type { SkillName } from "@/lib/constants";

const chartConfig = {
  average: {
    label: "Population Average",
    color: "hsl(210, 70%, 50%)",
  },
};

export function SkillRadarPopulation({
  data,
}: {
  data: { skillName: string; average: number }[];
}) {
  const radarData = data.map((d) => ({
    skill: d.skillName.replace("Planning & Problem-Solving", "Planning"),
    average: d.average,
    fullMark: 100,
    fill: SKILL_COLORS[d.skillName as SkillName] || "hsl(210, 60%, 55%)",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skill Profile</CardTitle>
        <CardDescription>
          Population averages across skill areas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <defs>
              <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(210, 70%, 55%)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(260, 60%, 55%)" stopOpacity={0.15} />
              </linearGradient>
            </defs>
            <PolarGrid stroke="hsl(0, 0%, 80%)" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="skill"
              tick={{ fontSize: 11, fill: "hsl(0, 0%, 45%)" }}
            />
            <PolarRadiusAxis
              domain={[0, 100]}
              tick={{ fontSize: 9 }}
              axisLine={false}
              tickCount={5}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Radar
              name="Average"
              dataKey="average"
              stroke="hsl(210, 70%, 50%)"
              strokeWidth={2.5}
              fill="url(#radarFill)"
              dot={{ r: 4, fill: "hsl(210, 70%, 50%)", strokeWidth: 0 }}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
