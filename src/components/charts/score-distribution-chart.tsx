"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DistributionBucket } from "@/lib/types";

const chartConfig = {
  count: {
    label: "People",
    color: "hsl(210, 70%, 55%)",
  },
};

function getBarColor(rangeStart: number) {
  if (rangeStart >= 80) return "hsl(152, 60%, 48%)";
  if (rangeStart >= 60) return "hsl(210, 70%, 55%)";
  if (rangeStart >= 40) return "hsl(45, 85%, 55%)";
  return "hsl(0, 70%, 55%)";
}

export function ScoreDistributionChart({
  data,
}: {
  data: DistributionBucket[];
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const weightedAvg = total > 0
    ? data.reduce((sum, d) => sum + (d.rangeStart + 2.5) * d.count, 0) / total
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Score Distribution</CardTitle>
        <CardDescription>
          Distribution of average scores across {total} people
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <BarChart data={data} accessibilityLayer>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(210, 70%, 55%)" stopOpacity={0.9} />
                <stop offset="100%" stopColor="hsl(210, 70%, 55%)" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => (
                    <span>{Number(value)} people ({item.payload.rangeStart}-{item.payload.rangeEnd})</span>
                  )}
                />
              }
            />
            {weightedAvg > 0 && (
              <ReferenceLine
                x={`${Math.floor(weightedAvg / 5) * 5}`}
                stroke="hsl(0, 0%, 50%)"
                strokeDasharray="4 4"
                label={{ value: `Avg ${weightedAvg.toFixed(0)}`, position: "top", fontSize: 11 }}
              />
            )}
            <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
              {data.map((entry, index) => (
                <Cell key={index} fill={getBarColor(entry.rangeStart)} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
