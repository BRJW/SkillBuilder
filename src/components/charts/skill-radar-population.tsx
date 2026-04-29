"use client";

import { motion } from "framer-motion";
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
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const chartConfig = {
  average: {
    label: "Population Average",
    color: "hsl(210, 70%, 50%)",
  },
};

export function SkillRadarPopulation({
  data,
  trends,
}: {
  data: { skillName: string; average: number }[];
  trends?: { skillName: string; change: number }[];
}) {
  const trendMap = new Map(trends?.map((t) => [t.skillName, t.change]) ?? []);

  const radarData = data.map((d) => ({
    skill: d.skillName.replace("Planning & Problem-Solving", "Planning"),
    average: d.average,
    fullMark: 100,
    fill: SKILL_COLORS[d.skillName as SkillName] || "hsl(210, 60%, 55%)",
  }));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Skill Profile</CardTitle>
          <CardDescription>
            Population averages across skill areas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
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

          {trends && trends.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {data.map((d) => {
                const change = trendMap.get(d.skillName) ?? 0;
                const color = SKILL_COLORS[d.skillName as SkillName] || "hsl(210, 60%, 55%)";
                return (
                  <div
                    key={d.skillName}
                    className="flex items-center justify-between p-1.5 rounded-md bg-muted/40 text-xs"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="truncate">{d.skillName.replace("Planning & Problem-Solving", "Planning")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{d.average.toFixed(1)}</span>
                      {Math.abs(change) >= 0.3 ? (
                        change > 0 ? (
                          <TrendingUp className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )
                      ) : (
                        <Minus className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
