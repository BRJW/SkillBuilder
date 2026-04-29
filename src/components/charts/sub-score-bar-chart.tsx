"use client";

import { motion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, ReferenceLine } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SKILL_COLORS } from "@/lib/constants";
import type { SkillName } from "@/lib/constants";
import type { SubScoreAverage } from "@/lib/types";

const chartConfig = {
  average: {
    label: "Average Step",
    color: "var(--chart-1)",
  },
};

export function SubScoreBarChart({ data }: { data: SubScoreAverage[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: d.subScoreName,
    fill: SKILL_COLORS[d.skillName as SkillName] || "hsl(210, 60%, 55%)",
  }));

  const overallAvg = data.length > 0
    ? data.reduce((sum, d) => sum + d.average, 0) / data.length
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Sub-Score Breakdown</CardTitle>
          <CardDescription>
            Average steps across {data.length} sub-scores (overall avg: {overallAvg.toFixed(1)})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[500px] w-full">
            <BarChart
              data={formatted}
              layout="vertical"
              margin={{ left: 130, right: 20 }}
              accessibilityLayer
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />
              <YAxis
                type="category"
                dataKey="label"
                tickLine={false}
                axisLine={false}
                width={120}
                tick={{ fontSize: 11 }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => (
                      <span className="font-medium">
                        {item.payload.skillName} &middot; {Number(value).toFixed(1)}
                      </span>
                    )}
                  />
                }
              />
              <ReferenceLine
                x={overallAvg}
                stroke="hsl(0, 0%, 60%)"
                strokeDasharray="4 4"
                label={{ value: "Avg", position: "top", fontSize: 10 }}
              />
              <Bar dataKey="average" radius={[0, 6, 6, 0]} maxBarSize={20}>
                {formatted.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}
