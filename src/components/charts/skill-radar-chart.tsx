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
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { SubScoreDetail } from "@/lib/types";

const chartConfig = {
  step: {
    label: "Latest Step",
    color: "hsl(210, 70%, 50%)",
  },
};

export function SkillRadarChart({ data }: { data: SubScoreDetail[] }) {
  const radarData = data.map((d) => {
    const latest = d.values[d.values.length - 1];
    const first = d.values[0];
    return {
      subScore: d.subScoreName,
      step: latest ? Math.round(latest.value * 100) / 100 : 0,
      change: latest && first && d.values.length >= 2
        ? Math.round((latest.value - first.value) * 10) / 10
        : 0,
      fullMark: 100,
    };
  });

  const avgChange = radarData.length > 0
    ? radarData.reduce((s, d) => s + d.change, 0) / radarData.length
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Skill Profile</CardTitle>
              <CardDescription>Latest sub-score values</CardDescription>
            </div>
            {Math.abs(avgChange) >= 0.3 && (
              <div className={`flex items-center gap-1 text-sm font-medium ${avgChange > 0 ? "text-emerald-600" : "text-red-500"}`}>
                {avgChange > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {avgChange > 0 ? "+" : ""}{avgChange.toFixed(1)} since first
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <defs>
                <linearGradient id="personalRadarFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(210, 70%, 55%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(260, 60%, 55%)" stopOpacity={0.15} />
                </linearGradient>
              </defs>
              <PolarGrid stroke="hsl(0, 0%, 80%)" strokeDasharray="3 3" />
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
                name="Step"
                dataKey="step"
                stroke="hsl(210, 70%, 50%)"
                strokeWidth={2.5}
                fill="url(#personalRadarFill)"
                dot={{ r: 4, fill: "hsl(210, 70%, 50%)", strokeWidth: 0 }}
              />
            </RadarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}
