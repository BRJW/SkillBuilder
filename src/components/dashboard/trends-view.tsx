"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Line,
  LineChart,
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
  ComposedChart,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus, Target } from "lucide-react";
import { SKILL_COLORS } from "@/lib/constants";
import type { SkillName } from "@/lib/constants";
import type {
  PercentileBandPoint,
  SkillPeriodRow,
  SubScorePeriodRow,
  GoalAttainmentRow,
} from "@/lib/types";

// --- Helpers ---

function getHeatColor(value: number): string {
  const hue = (value / 100) * 120;
  const sat = 60 + (Math.abs(value - 50) / 50) * 20;
  const light = 46 + (value / 100) * 10;
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

function getTextColor(value: number): string {
  return value < 35 || value > 75 ? "white" : "hsl(0, 0%, 15%)";
}

function Sparkline({
  values,
  color,
  width = 64,
  height = 22,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  const range = max - min || 1;
  const pad = 2;

  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (width - pad * 2);
      const y = pad + (1 - (v - min) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="inline-block align-middle">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {values.length > 0 && (() => {
        const lastVal = values[values.length - 1];
        const cx = width - pad;
        const cy = pad + (1 - (lastVal - min) / range) * (height - pad * 2);
        return <circle cx={cx} cy={cy} r={2} fill={color} />;
      })()}
    </svg>
  );
}

function TrendArrow({ change }: { change: number }) {
  if (Math.abs(change) < 0.3) {
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  }
  if (change > 0) {
    return <TrendingUp className="h-3 w-3 text-emerald-500" />;
  }
  return <TrendingDown className="h-3 w-3 text-red-500" />;
}

// --- Sub-components ---

function HeatmapTable({
  rows,
  periods,
  goalThreshold,
}: {
  rows: { label: string; skillName: string; values: number[] }[];
  periods: string[];
  goalThreshold: number;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left p-2.5 font-medium w-36 sticky left-0 bg-muted/50 z-10">
              Metric
            </th>
            {periods.map((p) => (
              <th key={p} className="text-center p-2.5 font-medium whitespace-nowrap">
                {new Date(p).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
              </th>
            ))}
            <th className="text-center p-2.5 font-medium w-20">Trend</th>
            <th className="text-center p-2.5 font-medium w-12">Δ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => {
            const change = row.values.length >= 2
              ? row.values[row.values.length - 1] - row.values[0]
              : 0;
            const color = SKILL_COLORS[row.skillName as SkillName] || "hsl(210, 60%, 55%)";

            return (
              <motion.tr
                key={row.label}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: rowIdx * 0.03 }}
                className="border-t hover:bg-muted/30 transition-colors"
              >
                <td className="p-2.5 font-medium sticky left-0 bg-background z-10">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate">{row.label}</span>
                  </div>
                </td>
                {row.values.map((val, i) => {
                  const bg = getHeatColor(val);
                  const textCol = getTextColor(val);
                  const belowGoal = val < goalThreshold;
                  return (
                    <td key={i} className="p-1 text-center">
                      <div
                        className="rounded-md px-2 py-1.5 text-xs font-mono font-medium transition-all duration-200 hover:scale-110 hover:shadow-md cursor-default"
                        style={{ backgroundColor: bg, color: textCol }}
                        title={`${row.label}: ${val.toFixed(1)} (${belowGoal ? "below" : "at/above"} goal of ${goalThreshold})`}
                      >
                        {val.toFixed(1)}
                        {belowGoal && (
                          <span className="ml-0.5 opacity-70">•</span>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="p-2.5 text-center">
                  <Sparkline values={row.values} color={color} />
                </td>
                <td className="p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <TrendArrow change={change} />
                    <span
                      className={`text-xs font-medium ${
                        Math.abs(change) < 0.3
                          ? "text-muted-foreground"
                          : change > 0
                          ? "text-emerald-600"
                          : "text-red-500"
                      }`}
                    >
                      {change > 0 ? "+" : ""}
                      {change.toFixed(1)}
                    </span>
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GoalChart({
  data,
  goalThreshold,
}: {
  data: GoalAttainmentRow[];
  goalThreshold: number;
}) {
  const thresholdKey =
    goalThreshold >= 90
      ? "above90"
      : goalThreshold >= 80
      ? "above80"
      : goalThreshold >= 70
      ? "above70"
      : goalThreshold >= 60
      ? "above60"
      : "above50";

  const chartData = data.map((row) => ({
    label: row.label,
    pct: row.total > 0 ? Math.round((row[thresholdKey] / row.total) * 1000) / 10 : 0,
    count: row[thresholdKey],
    total: row.total,
  }));

  const latest = chartData[chartData.length - 1];
  const first = chartData[0];
  const pctChange = latest && first ? latest.pct - first.pct : 0;

  const config = {
    pct: { label: `% ≥ ${goalThreshold}`, color: "hsl(152, 60%, 48%)" },
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-500" />
              Goal Attainment
            </CardTitle>
            <CardDescription>
              % of people scoring ≥ {goalThreshold}
            </CardDescription>
          </div>
          {latest && (
            <div className="text-right">
              <div className="text-2xl font-bold">{latest.pct.toFixed(1)}%</div>
              <div
                className={`text-xs font-medium ${
                  pctChange > 0 ? "text-emerald-600" : pctChange < 0 ? "text-red-500" : "text-muted-foreground"
                }`}
              >
                {pctChange > 0 ? "+" : ""}
                {pctChange.toFixed(1)}pp since start
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[200px] w-full">
          <AreaChart data={chartData} accessibilityLayer>
            <defs>
              <linearGradient id="goalFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(152, 60%, 48%)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(152, 60%, 48%)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `${v}%`} />
            <ReferenceLine y={50} stroke="hsl(0, 0%, 70%)" strokeDasharray="4 4" />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => (
                    <span>{Number(value).toFixed(1)}% ({item.payload.count}/{item.payload.total} people)</span>
                  )}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="pct"
              stroke="hsl(152, 60%, 48%)"
              strokeWidth={2.5}
              fill="url(#goalFill)"
              dot={{ r: 4, fill: "hsl(152, 60%, 48%)", strokeWidth: 0 }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function PercentileMini({ data }: { data: PercentileBandPoint[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.assessedAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
  }));

  const config = {
    p50: { label: "Median", color: "hsl(210, 80%, 50%)" },
    p75: { label: "75th", color: "hsl(210, 70%, 65%)" },
    p25: { label: "25th", color: "hsl(210, 70%, 65%)" },
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Percentile Bands</CardTitle>
        <CardDescription>Median and interquartile range over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[200px] w-full">
          <ComposedChart data={formatted} accessibilityLayer>
            <defs>
              <linearGradient id="trendBandFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(210, 70%, 55%)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="hsl(210, 70%, 55%)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="p75" stroke="none" fill="url(#trendBandFill)" />
            <Area type="monotone" dataKey="p25" stroke="none" fill="url(#trendBandFill)" />
            <Line type="monotone" dataKey="p75" stroke="hsl(210, 65%, 65%)" strokeWidth={1} dot={false} />
            <Line type="monotone" dataKey="p50" stroke="hsl(210, 80%, 45%)" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(210, 80%, 45%)" }} />
            <Line type="monotone" dataKey="p25" stroke="hsl(210, 65%, 65%)" strokeWidth={1} dot={false} />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// --- Color Legend ---

function ColorLegend({ goalThreshold }: { goalThreshold: number }) {
  const stops = [0, 20, 40, 60, 80, 100];
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span>Low</span>
      <div className="flex h-3 rounded-full overflow-hidden w-32">
        {stops.slice(0, -1).map((s, i) => (
          <div
            key={s}
            className="flex-1"
            style={{ backgroundColor: getHeatColor(s + (stops[i + 1] - s) / 2) }}
          />
        ))}
      </div>
      <span>High</span>
      <div className="flex items-center gap-1 ml-3">
        <span className="opacity-70">•</span>
        <span>Below goal ({goalThreshold})</span>
      </div>
    </div>
  );
}

// --- Main Component ---

interface TrendsViewProps {
  percentiles: PercentileBandPoint[];
  skillMatrix: SkillPeriodRow[];
  subScoreMatrix: SubScorePeriodRow[];
  goalAttainment: GoalAttainmentRow[];
}

const GOAL_OPTIONS = [50, 60, 70, 80, 90];

export function TrendsView({
  percentiles,
  skillMatrix,
  subScoreMatrix,
  goalAttainment,
}: TrendsViewProps) {
  const [selectedSkill, setSelectedSkill] = useState<string>("all");
  const [goalThreshold, setGoalThreshold] = useState(70);

  // Get all unique periods
  const allPeriods = skillMatrix.length > 0
    ? skillMatrix[0].periods.map((p) => p.date)
    : [];

  // Build heatmap rows based on selection
  const heatmapRows = selectedSkill === "all"
    ? skillMatrix.map((row) => ({
        label: row.skillName,
        skillName: row.skillName,
        values: row.periods.map((p) => p.average),
      }))
    : subScoreMatrix
        .filter((row) => row.skillName === selectedSkill)
        .map((row) => ({
          label: row.subScoreName,
          skillName: row.skillName,
          values: row.periods.map((p) => p.average),
        }));

  const skillNames = skillMatrix.map((s) => s.skillName);

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Scope Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Scope:</span>
          <Select value={selectedSkill} onValueChange={(v) => setSelectedSkill(v ?? "all")}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue>
                {selectedSkill === "all" ? "All Skills" : selectedSkill}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Skills (overview)</SelectItem>
              {skillNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name} (sub-scores)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Goal:</span>
          <div className="flex rounded-lg border overflow-hidden">
            {GOAL_OPTIONS.map((g) => (
              <button
                key={g}
                onClick={() => setGoalThreshold(g)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  goalThreshold === g
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                ≥{g}
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto">
          <ColorLegend goalThreshold={goalThreshold} />
        </div>
      </div>

      {/* Top row: Percentile bands + Goal attainment */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PercentileMini data={percentiles} />
        <GoalChart data={goalAttainment} goalThreshold={goalThreshold} />
      </div>

      {/* Heatmap */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedSkill}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selectedSkill === "all" ? "Skill Performance Matrix" : `${selectedSkill} — Sub-Score Details`}
              </CardTitle>
              <CardDescription>
                {selectedSkill === "all"
                  ? "Average values per skill across assessment periods. Select a skill above to drill into sub-scores."
                  : "Average values per sub-score. Color indicates performance level, • marks below-goal values."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {heatmapRows.length > 0 ? (
                <HeatmapTable
                  rows={heatmapRows}
                  periods={allPeriods}
                  goalThreshold={goalThreshold}
                />
              ) : (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  No data available for this selection.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Skill trend lines when viewing all skills */}
      {selectedSkill === "all" && skillMatrix.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Skill Trends Over Time</CardTitle>
              <CardDescription>How each skill area evolves across assessment periods</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={Object.fromEntries(
                  skillNames.map((name) => [
                    name,
                    { label: name, color: SKILL_COLORS[name as SkillName] || "hsl(210,60%,55%)" },
                  ])
                )}
                className="h-[320px] w-full"
              >
                <LineChart
                  data={allPeriods.map((date, pIdx) => {
                    const point: Record<string, string | number> = {
                      label: new Date(date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
                    };
                    for (const skill of skillMatrix) {
                      if (skill.periods[pIdx]) {
                        point[skill.skillName] = skill.periods[pIdx].average;
                      }
                    }
                    return point;
                  })}
                  accessibilityLayer
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} />
                  <ReferenceLine
                    y={goalThreshold}
                    stroke="hsl(0, 0%, 60%)"
                    strokeDasharray="6 3"
                    label={{ value: `Goal (${goalThreshold})`, position: "right", fontSize: 10, fill: "hsl(0,0%,50%)" }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {skillNames.map((name) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={SKILL_COLORS[name as SkillName] || "hsl(210,60%,55%)"}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
