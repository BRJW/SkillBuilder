"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, TrendingUp, TrendingDown, Minus, Users } from "lucide-react";
import { SKILL_COLORS } from "@/lib/constants";
import type { SkillName } from "@/lib/constants";
import type { DistributionBucket, ScopedDistribution } from "@/lib/types";

// --- Helpers ---

function getBarColor(rangeStart: number) {
  if (rangeStart >= 80) return "hsl(152, 60%, 48%)";
  if (rangeStart >= 60) return "hsl(210, 70%, 55%)";
  if (rangeStart >= 40) return "hsl(45, 85%, 55%)";
  return "hsl(0, 70%, 55%)";
}

function getGoalPct(
  stats: ScopedDistribution["stats"],
  goal: number
): number {
  if (goal >= 80) return stats.pctAbove80;
  if (goal >= 70) return stats.pctAbove70;
  if (goal >= 60) return stats.pctAbove60;
  return stats.pctAbove50;
}

const SCOPE_COLORS = [
  "hsl(210, 70%, 55%)",
  "hsl(152, 60%, 48%)",
  "hsl(270, 60%, 55%)",
  "hsl(25, 85%, 55%)",
  "hsl(330, 70%, 55%)",
  "hsl(180, 55%, 45%)",
  "hsl(45, 80%, 50%)",
  "hsl(0, 70%, 55%)",
];

// --- Sub-components ---

function Histogram({
  data,
  goalThreshold,
  height = 280,
}: {
  data: DistributionBucket[];
  goalThreshold: number;
  height?: number;
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const weightedAvg = total > 0
    ? data.reduce((sum, d) => sum + (d.rangeStart + 2.5) * d.count, 0) / total
    : 0;
  const goalBucket = `${Math.floor(goalThreshold / 5) * 5}`;

  const config = { count: { label: "People", color: "hsl(210, 70%, 55%)" } };

  return (
    <ChartContainer config={config} className={`w-full`} style={{ height }}>
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} fontSize={10} />
        <YAxis tickLine={false} axisLine={false} fontSize={10} />
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
            label={{ value: `Avg ${weightedAvg.toFixed(0)}`, position: "top", fontSize: 10 }}
          />
        )}
        <ReferenceLine
          x={goalBucket}
          stroke="hsl(152, 60%, 48%)"
          strokeWidth={2}
          strokeDasharray="6 3"
          label={{ value: `Goal`, position: "insideTopRight", fontSize: 10, fill: "hsl(152, 60%, 38%)" }}
        />
        <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={32}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={getBarColor(entry.rangeStart)}
              fillOpacity={entry.rangeStart >= goalThreshold ? 0.9 : 0.35}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function StatsPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-xs">
      {color && <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />}
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function StatsBar({ dist, goalThreshold, color }: { dist: ScopedDistribution; goalThreshold: number; color?: string }) {
  const pctAbove = getGoalPct(dist.stats, goalThreshold);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatsPill label="Mean" value={dist.stats.mean.toFixed(1)} color={color} />
      <StatsPill label="Median" value={dist.stats.median.toFixed(1)} />
      <StatsPill label="Std Dev" value={dist.stats.stdDev.toFixed(1)} />
      <StatsPill label="IQR" value={`${dist.stats.p25.toFixed(0)}–${dist.stats.p75.toFixed(0)}`} />
      <StatsPill label={`≥${goalThreshold}`} value={`${pctAbove.toFixed(1)}%`} />
      <StatsPill label="n" value={`${dist.stats.count}`} />
    </div>
  );
}

function SmallMultipleGrid({
  distributions,
  goalThreshold,
  scopeType,
}: {
  distributions: ScopedDistribution[];
  goalThreshold: number;
  scopeType: "skill" | "group" | "period";
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {distributions.map((dist, i) => {
        const color = scopeType === "skill"
          ? SKILL_COLORS[dist.key as SkillName] || SCOPE_COLORS[i % SCOPE_COLORS.length]
          : SCOPE_COLORS[i % SCOPE_COLORS.length];
        const pctAbove = getGoalPct(dist.stats, goalThreshold);

        return (
          <motion.div
            key={dist.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-1 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <CardTitle className="text-sm">{dist.key}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs font-mono">
                      μ {dist.stats.mean.toFixed(1)}
                    </Badge>
                    <Badge
                      variant={pctAbove >= 50 ? "default" : "outline"}
                      className="text-xs"
                    >
                      {pctAbove.toFixed(0)}% ≥{goalThreshold}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-2">
                <Histogram data={dist.buckets} goalThreshold={goalThreshold} height={180} />
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

function ComparisonTable({
  distributions,
  goalThreshold,
  scopeType,
}: {
  distributions: ScopedDistribution[];
  goalThreshold: number;
  scopeType: "skill" | "group" | "period";
}) {
  const sorted = [...distributions].sort((a, b) => b.stats.mean - a.stats.mean);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left p-2.5 font-medium">{scopeType === "skill" ? "Skill" : scopeType === "group" ? "Group" : "Period"}</th>
            <th className="text-right p-2.5 font-medium">Mean</th>
            <th className="text-right p-2.5 font-medium">Median</th>
            <th className="text-right p-2.5 font-medium">Std Dev</th>
            <th className="text-right p-2.5 font-medium">P25</th>
            <th className="text-right p-2.5 font-medium">P75</th>
            <th className="text-right p-2.5 font-medium">≥{goalThreshold}</th>
            <th className="text-right p-2.5 font-medium">People</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((dist, i) => {
            const color = scopeType === "skill"
              ? SKILL_COLORS[dist.key as SkillName] || SCOPE_COLORS[i % SCOPE_COLORS.length]
              : SCOPE_COLORS[i % SCOPE_COLORS.length];
            const pctAbove = getGoalPct(dist.stats, goalThreshold);

            return (
              <motion.tr
                key={dist.key}
                className="border-t hover:bg-muted/30 transition-colors"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <td className="p-2.5 font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    {dist.key}
                  </div>
                </td>
                <td className="p-2.5 text-right font-mono">{dist.stats.mean.toFixed(1)}</td>
                <td className="p-2.5 text-right font-mono">{dist.stats.median.toFixed(1)}</td>
                <td className="p-2.5 text-right font-mono text-muted-foreground">{dist.stats.stdDev.toFixed(1)}</td>
                <td className="p-2.5 text-right font-mono text-muted-foreground">{dist.stats.p25.toFixed(1)}</td>
                <td className="p-2.5 text-right font-mono text-muted-foreground">{dist.stats.p75.toFixed(1)}</td>
                <td className="p-2.5 text-right">
                  <span className={`font-medium ${pctAbove >= 50 ? "text-emerald-600" : "text-amber-600"}`}>
                    {pctAbove.toFixed(1)}%
                  </span>
                </td>
                <td className="p-2.5 text-right text-muted-foreground">{dist.stats.count}</td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// --- Main Component ---

interface DistributionViewProps {
  overall: DistributionBucket[];
  distributionTrend: { assessedAt: string; mean: number; stdDev: number; count: number }[];
  bySkill: ScopedDistribution[];
  byGroup: ScopedDistribution[];
  byPeriod: ScopedDistribution[];
}

const GOAL_OPTIONS = [50, 60, 70, 80];
type ScopeView = "overall" | "skill" | "group" | "period";

export function DistributionView({
  overall,
  distributionTrend,
  bySkill,
  byGroup,
  byPeriod,
}: DistributionViewProps) {
  const [scope, setScope] = useState<ScopeView>("overall");
  const [goalThreshold, setGoalThreshold] = useState(70);

  const total = overall.reduce((sum, d) => sum + d.count, 0);
  const weightedAvg = total > 0
    ? overall.reduce((sum, d) => sum + (d.rangeStart + 2.5) * d.count, 0) / total
    : 0;

  const distributions = scope === "skill" ? bySkill : scope === "group" ? byGroup : scope === "period" ? byPeriod : [];

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
          <span className="text-sm font-medium text-muted-foreground">View:</span>
          <div className="flex rounded-lg border overflow-hidden">
            {([
              { key: "overall", label: "Overall" },
              { key: "skill", label: "By Skill" },
              { key: "group", label: "By Group" },
              { key: "period", label: "By Period" },
            ] as { key: ScopeView; label: string }[]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setScope(opt.key)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  scope === opt.key
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
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

        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {total} people &middot; Avg {weightedAvg.toFixed(1)}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {scope === "overall" ? (
          <motion.div
            key="overall"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Main histogram */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  Overall Distribution
                </CardTitle>
                <CardDescription>
                  Distribution of average steps across all {total} people. Bars dimmed below the goal threshold.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Histogram data={overall} goalThreshold={goalThreshold} height={350} />
              </CardContent>
            </Card>

            {/* Trend mini chart */}
            {distributionTrend.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribution Trend</CardTitle>
                  <CardDescription>Mean &plusmn; 1 std dev across assessment periods</CardDescription>
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
                        <ReferenceLine y={goalThreshold} stroke="hsl(152, 60%, 48%)" strokeDasharray="6 3" />
                        <Line type="monotone" dataKey="upper" stroke="hsl(210, 60%, 75%)" strokeWidth={1} strokeDasharray="4 3" dot={false} />
                        <Line type="monotone" dataKey="mean" stroke="hsl(210, 80%, 50%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(210, 80%, 50%)" }} />
                        <Line type="monotone" dataKey="lower" stroke="hsl(210, 60%, 75%)" strokeWidth={1} strokeDasharray="4 3" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-0.5 bg-blue-500 rounded" />Mean
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-0.5 border-t border-dashed border-blue-300" />&plusmn;1σ
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-0.5 border-t border-dashed border-emerald-400" />Goal
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        ) : (
          <motion.div
            key={scope}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Comparison table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {scope === "skill" ? "Skill" : scope === "group" ? "Group" : "Period"} Comparison
                </CardTitle>
                <CardDescription>
                  Summary statistics across {distributions.length} {scope === "skill" ? "skills" : scope === "group" ? "groups" : "periods"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ComparisonTable
                  distributions={distributions}
                  goalThreshold={goalThreshold}
                  scopeType={scope as "skill" | "group" | "period"}
                />
              </CardContent>
            </Card>

            {/* Small multiples */}
            <SmallMultipleGrid
              distributions={distributions}
              goalThreshold={goalThreshold}
              scopeType={scope as "skill" | "group" | "period"}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
