"use client";

import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SubScoreDetail } from "@/lib/types";

const COLORS = [
  "hsl(210, 70%, 50%)",
  "hsl(150, 60%, 45%)",
  "hsl(25, 85%, 55%)",
  "hsl(270, 60%, 55%)",
  "hsl(330, 70%, 55%)",
  "hsl(180, 55%, 45%)",
  "hsl(75, 55%, 45%)",
  "hsl(0, 70%, 55%)",
  "hsl(45, 80%, 50%)",
  "hsl(300, 50%, 50%)",
];

export function ScoreTrendLine({ data }: { data: SubScoreDetail[] }) {
  // Build a pivoted dataset: each row is a date, columns are sub-scores
  const allDates = new Set<string>();
  for (const d of data) {
    for (const v of d.values) {
      allDates.add(v.assessedAt);
    }
  }
  const sortedDates = [...allDates].sort();

  const chartData = sortedDates.map((date) => {
    const point: Record<string, string | number> = {
      date,
      label: new Date(date).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      }),
    };
    for (const d of data) {
      const match = d.values.find((v) => v.assessedAt === date);
      if (match) {
        point[d.subScoreName] = match.value;
      }
    }
    return point;
  });

  const chartConfig: Record<string, { label: string; color: string }> = {};
  data.forEach((d, i) => {
    chartConfig[d.subScoreName] = {
      label: d.subScoreName,
      color: COLORS[i % COLORS.length],
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Score Trajectory</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <LineChart data={chartData} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {data.map((d, i) => (
              <Line
                key={d.subScoreId}
                type="monotone"
                dataKey={d.subScoreName}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
