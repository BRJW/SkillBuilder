"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
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
import { BarChart3, ChevronRight, Loader2, Users } from "lucide-react";
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

function getScopeColor(key: string, index: number, scopeType: string) {
  if (scopeType === "skill" || scopeType === "drillSkill")
    return SKILL_COLORS[key as SkillName] || SCOPE_COLORS[index % SCOPE_COLORS.length];
  return SCOPE_COLORS[index % SCOPE_COLORS.length];
}

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

  const config = { count: { label: "Count", color: "hsl(210, 70%, 55%)" } };

  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} fontSize={10} />
        <YAxis tickLine={false} axisLine={false} fontSize={10} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, _name, item) => (
                <span>{Number(value)} ({item.payload.rangeStart}-{item.payload.rangeEnd})</span>
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
          label={{ value: "Goal", position: "insideTopRight", fontSize: 10, fill: "hsl(152, 60%, 38%)" }}
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

function StatsPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1 text-xs">
      {color && <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />}
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function SmallMultipleGrid({
  distributions,
  goalThreshold,
  scopeType,
  onDrill,
}: {
  distributions: ScopedDistribution[];
  goalThreshold: number;
  scopeType: string;
  onDrill?: (dist: ScopedDistribution) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {distributions.map((dist, i) => {
        const color = getScopeColor(dist.key, i, scopeType);
        const pctAbove = getGoalPct(dist.stats, goalThreshold);
        const clickable = !!onDrill;

        return (
          <motion.div
            key={dist.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card
              className={`overflow-hidden transition-shadow ${
                clickable
                  ? "cursor-pointer hover:shadow-lg hover:ring-1 hover:ring-primary/30"
                  : "hover:shadow-md"
              }`}
              onClick={clickable ? () => onDrill(dist) : undefined}
            >
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
                    {clickable && (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
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
  onDrill,
}: {
  distributions: ScopedDistribution[];
  goalThreshold: number;
  scopeType: string;
  onDrill?: (dist: ScopedDistribution) => void;
}) {
  const sorted = [...distributions].sort((a, b) => b.stats.mean - a.stats.mean);
  const clickable = !!onDrill;
  const scopeLabel = scopeType === "skill" ? "Skill" : scopeType === "group" ? "Group" : scopeType === "period" ? "Period" : "Sub-Score";

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left p-2.5 font-medium">{scopeLabel}</th>
            <th className="text-right p-2.5 font-medium">Mean</th>
            <th className="text-right p-2.5 font-medium">Median</th>
            <th className="text-right p-2.5 font-medium">Std Dev</th>
            <th className="text-right p-2.5 font-medium">P25</th>
            <th className="text-right p-2.5 font-medium">P75</th>
            <th className="text-right p-2.5 font-medium">≥{goalThreshold}</th>
            <th className="text-right p-2.5 font-medium">Count</th>
            {clickable && <th className="w-8" />}
          </tr>
        </thead>
        <tbody>
          {sorted.map((dist, i) => {
            const color = getScopeColor(dist.key, i, scopeType);
            const pctAbove = getGoalPct(dist.stats, goalThreshold);

            return (
              <motion.tr
                key={dist.key}
                className={`border-t transition-colors ${
                  clickable
                    ? "cursor-pointer hover:bg-primary/5"
                    : "hover:bg-muted/30"
                }`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={clickable ? () => onDrill(dist) : undefined}
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
                {clickable && (
                  <td className="p-2.5">
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </td>
                )}
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Breadcrumb({
  items,
  onNavigate,
}: {
  items: { label: string; onClick?: () => void }[];
  onNavigate?: () => void;
}) {
  return (
    <div className="flex items-center gap-1 text-sm">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="text-primary hover:underline font-medium"
            >
              {item.label}
            </button>
          ) : (
            <span className="font-semibold">{item.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

// --- Main Component ---

interface DistributionViewProps {
  rubricId: string;
  overall: DistributionBucket[];
  distributionTrend: { assessedAt: string; mean: number; stdDev: number; count: number }[];
  bySkill: ScopedDistribution[];
  byGroup: ScopedDistribution[];
  byPeriod: ScopedDistribution[];
}

const GOAL_OPTIONS = [50, 60, 70, 80];
type ScopeView = "overall" | "skill" | "group" | "period";

interface DrillState {
  scope: "skill" | "group" | "period";
  key: string;
  label: string;
  data: ScopedDistribution[] | null;
  loading: boolean;
}

export function DistributionView({
  rubricId,
  overall,
  distributionTrend,
  bySkill,
  byGroup,
  byPeriod,
}: DistributionViewProps) {
  const [scope, setScope] = useState<ScopeView>("overall");
  const [goalThreshold, setGoalThreshold] = useState(70);
  const [drill, setDrill] = useState<DrillState | null>(null);
  const searchParams = useSearchParams();

  const total = overall.reduce((sum, d) => sum + d.count, 0);
  const weightedAvg = total > 0
    ? overall.reduce((sum, d) => sum + (d.rangeStart + 2.5) * d.count, 0) / total
    : 0;

  const distributions = scope === "skill" ? bySkill : scope === "group" ? byGroup : scope === "period" ? byPeriod : [];

  const fetchDrill = useCallback(async (drillScope: "skill" | "group" | "period", dist: ScopedDistribution) => {
    const lookupKey = dist.rawKey || dist.key;
    setDrill({ scope: drillScope, key: lookupKey, label: dist.key, data: null, loading: true });

    const qp = new URLSearchParams();
    qp.set("scope", drillScope);
    qp.set("key", lookupKey);
    const group = searchParams.get("group");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (group) qp.set("group", group);
    if (from) qp.set("from", from);
    if (to) qp.set("to", to);

    try {
      const res = await fetch(`/api/distribution/${rubricId}/drill?${qp.toString()}`);
      if (!res.ok) throw new Error("fetch failed");
      const data: ScopedDistribution[] = await res.json();
      setDrill((prev) => prev ? { ...prev, data, loading: false } : null);
    } catch {
      setDrill((prev) => prev ? { ...prev, data: [], loading: false } : null);
    }
  }, [rubricId, searchParams]);

  const handleDrill = useCallback((dist: ScopedDistribution) => {
    if (scope === "skill" || scope === "group" || scope === "period") {
      fetchDrill(scope, dist);
    }
  }, [scope, fetchDrill]);

  const clearDrill = useCallback(() => setDrill(null), []);

  const handleScopeChange = useCallback((newScope: ScopeView) => {
    setScope(newScope);
    setDrill(null);
  }, []);

  const drillScopeLabel = drill?.scope === "skill" ? "Sub-Scores" : "Skills";
  const parentScopeLabel = scope === "skill" ? "Skills" : scope === "group" ? "Groups" : "Periods";

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
              { key: "overall" as const, label: "Overall" },
              { key: "skill" as const, label: "By Skill" },
              { key: "group" as const, label: "By Group" },
              { key: "period" as const, label: "By Period" },
            ]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleScopeChange(opt.key)}
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

      {/* Breadcrumb when drilled */}
      {drill && (
        <Breadcrumb
          items={[
            { label: parentScopeLabel, onClick: clearDrill },
            { label: drill.label },
          ]}
        />
      )}

      <AnimatePresence mode="wait">
        {/* --- Overall view --- */}
        {scope === "overall" && !drill ? (
          <motion.div
            key="overall"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
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

        /* --- Drilled-down view --- */
        ) : drill ? (
          <motion.div
            key={`drill-${drill.scope}-${drill.key}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {drill.loading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading {drillScopeLabel.toLowerCase()}...</span>
                </CardContent>
              </Card>
            ) : drill.data && drill.data.length > 0 ? (
              <>
                {/* Summary stats for parent */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {drill.label} — {drillScopeLabel}
                    </CardTitle>
                    <CardDescription>
                      {drill.data.length} {drillScopeLabel.toLowerCase()} within {drill.label}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ComparisonTable
                      distributions={drill.data}
                      goalThreshold={goalThreshold}
                      scopeType={drill.scope === "skill" ? "subScore" : "drillSkill"}
                    />
                  </CardContent>
                </Card>

                <SmallMultipleGrid
                  distributions={drill.data}
                  goalThreshold={goalThreshold}
                  scopeType={drill.scope === "skill" ? "subScore" : "drillSkill"}
                />
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  No data available for this drill-down.
                </CardContent>
              </Card>
            )}
          </motion.div>

        /* --- Scoped list view (skill / group / period) --- */
        ) : (
          <motion.div
            key={scope}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {parentScopeLabel} Comparison
                </CardTitle>
                <CardDescription>
                  Click a row to drill into its {scope === "skill" ? "sub-scores" : "skills"}. {distributions.length} {parentScopeLabel.toLowerCase()} shown.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ComparisonTable
                  distributions={distributions}
                  goalThreshold={goalThreshold}
                  scopeType={scope}
                  onDrill={handleDrill}
                />
              </CardContent>
            </Card>

            <SmallMultipleGrid
              distributions={distributions}
              goalThreshold={goalThreshold}
              scopeType={scope}
              onDrill={handleDrill}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
