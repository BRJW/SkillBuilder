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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubScoreDetail } from "@/lib/types";

const chartConfig = {
  score: {
    label: "Latest Score",
    color: "hsl(210, 70%, 50%)",
  },
};

export function SkillRadarChart({ data }: { data: SubScoreDetail[] }) {
  // Use the most recent score for each sub-score
  const radarData = data.map((d) => {
    const latest = d.values[d.values.length - 1];
    return {
      subScore: d.subScoreName,
      score: latest?.value ?? 0,
      fullMark: 100,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skill Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid />
            <PolarAngleAxis
              dataKey="subScore"
              tick={{ fontSize: 11 }}
            />
            <PolarRadiusAxis
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Radar
              name="Score"
              dataKey="score"
              stroke="var(--color-score)"
              fill="var(--color-score)"
              fillOpacity={0.3}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
