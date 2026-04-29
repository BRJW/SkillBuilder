"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SKILL_COLORS } from "@/lib/constants";
import type { SkillName } from "@/lib/constants";
import type { SubScoreAverage } from "@/lib/types";

const chartConfig = {
  average: {
    label: "Average Score",
    color: "var(--chart-1)",
  },
};

export function SubScoreBarChart({ data }: { data: SubScoreAverage[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: d.subScoreName,
    fill: SKILL_COLORS[d.skillName as SkillName] || "var(--chart-1)",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sub-Score Averages</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <BarChart
            data={formatted}
            layout="vertical"
            margin={{ left: 120 }}
            accessibilityLayer
          >
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              tickLine={false}
              axisLine={false}
              width={110}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => (
                    <span>
                      {item.payload.skillName}: {Number(value).toFixed(1)}
                    </span>
                  )}
                />
              }
            />
            <Bar dataKey="average" radius={[0, 4, 4, 0]}>
              {formatted.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
