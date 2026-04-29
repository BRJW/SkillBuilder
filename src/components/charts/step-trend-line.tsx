"use client";

import { motion } from "framer-motion";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
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

export function StepTrendLine({ data }: { data: SubScoreDetail[] }) {
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
        point[d.subScoreName] = Math.round(match.value * 100) / 100;
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

  // Calculate overall trend
  const overallChanges = data.map((d) => {
    if (d.values.length < 2) return 0;
    return d.values[d.values.length - 1].value - d.values[0].value;
  });
  const avgChange = overallChanges.length > 0
    ? overallChanges.reduce((a, b) => a + b, 0) / overallChanges.length
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Step Trajectory</CardTitle>
              <CardDescription>Performance across assessment periods</CardDescription>
            </div>
            {Math.abs(avgChange) >= 0.3 && (
              <div className={`flex items-center gap-1 text-sm font-medium ${avgChange > 0 ? "text-emerald-600" : "text-red-500"}`}>
                {avgChange > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {avgChange > 0 ? "+" : ""}{avgChange.toFixed(1)} avg
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <LineChart data={chartData} accessibilityLayer>
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
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
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}
