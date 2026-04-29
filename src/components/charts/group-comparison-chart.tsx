"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = [
  "hsl(210, 70%, 55%)",
  "hsl(152, 60%, 48%)",
  "hsl(270, 60%, 55%)",
  "hsl(25, 85%, 55%)",
  "hsl(330, 70%, 55%)",
  "hsl(180, 55%, 45%)",
  "hsl(45, 80%, 50%)",
  "hsl(0, 70%, 55%)",
];

const chartConfig = {
  average: {
    label: "Avg Score",
    color: "hsl(210, 70%, 55%)",
  },
};

export function GroupComparisonChart({
  data,
}: {
  data: { groupName: string; average: number; count: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Group Comparison</CardTitle>
        <CardDescription>
          Average rubric scores by group
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <BarChart data={data} accessibilityLayer>
            <defs>
              {COLORS.map((color, i) => (
                <linearGradient key={i} id={`groupGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.5} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="groupName"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              fontSize={11}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => (
                    <span>
                      Avg: {Number(value).toFixed(1)} ({item.payload.count} people)
                    </span>
                  )}
                />
              }
            />
            <Bar dataKey="average" radius={[8, 8, 0, 0]} maxBarSize={60}>
              {data.map((_, index) => (
                <Cell key={index} fill={`url(#groupGrad${index % COLORS.length})`} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
