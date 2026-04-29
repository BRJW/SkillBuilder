"use client";

import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  ReferenceLine,
  Line,
  LineChart,
  ResponsiveContainer,
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

export function StepDistributionChart({
  data,
  distributionTrend,
}: {
  data: DistributionBucket[];
  distributionTrend?: { assessedAt: string; mean: number; stdDev: number; count: number }[];
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const weightedAvg = total > 0
    ? data.reduce((sum, d) => sum + (d.rangeStart + 2.5) * d.count, 0) / total
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Step Distribution</CardTitle>
          <CardDescription>
            Distribution of average steps across {total} people
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

      {distributionTrend && distributionTrend.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribution Trend</CardTitle>
            <CardDescription>
              How the mean and spread change over assessment periods
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={distributionTrend.map((d) => ({
                  ...d,
                  label: new Date(d.assessedAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
                  upper: Math.min(100, d.mean + d.stdDev),
                  lower: Math.max(0, d.mean - d.stdDev),
                }))}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} />
                  <Line type="monotone" dataKey="upper" stroke="hsl(210, 60%, 75%)" strokeWidth={1} strokeDasharray="4 3" dot={false} />
                  <Line type="monotone" dataKey="mean" stroke="hsl(210, 80%, 50%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(210, 80%, 50%)" }} />
                  <Line type="monotone" dataKey="lower" stroke="hsl(210, 60%, 75%)" strokeWidth={1} strokeDasharray="4 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 bg-blue-500 rounded" />
                Mean
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 border-t border-dashed border-blue-300" />
                &plusmn;1 Std Dev
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
